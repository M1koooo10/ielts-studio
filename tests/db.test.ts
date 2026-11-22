import {
  afterAll,
  beforeAll,
  describe,
  expect,
  inject,
  test,
  vi,
} from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { gradeAnswer } from "../src/lib/grading";
import { connection, openDatabase } from "../src/server/db/connection";
import {
  getDashboard,
  getLibrary,
  getMaterial,
  getSettings,
  updateSettings,
} from "../src/server/db";
import { claimLegacy } from "../src/server/db/legacy";
import {
  createAttempt,
  getAttempt,
  getRecording,
  saveAnswer,
  saveRecording,
} from "../src/server/db/attempts";

describe("migration and account ownership", () => {
  const anna = 101,
    dana = 202;
  const annaPhone = "+12025550134",
    danaPhone = "+12025550135";
  const now = Date.now();
  let filename: string;
  beforeAll(async () => {
    filename = inject("databaseTestFile");
    vi.stubEnv("STUDIO_DB_PATH", filename);
    const old = new DatabaseSync(filename);
    try {
      old.exec(
        "CREATE TABLE schema_migrations(filename TEXT PRIMARY KEY,applied_at INTEGER NOT NULL)",
      );
      for (const migration of ["0001_workspace.sql", "0002_seed.sql"]) {
        old.exec(await readFile("migrations/" + migration, "utf8"));
        old
          .prepare("INSERT INTO schema_migrations VALUES(?,?)")
          .run(migration, now);
      }
      old.prepare("UPDATE settings SET theme='dark'").run();
      old
        .prepare(
          "INSERT INTO attempts(id,title,kind,state,started_at,updated_at,submitted_at) VALUES(1,'Legacy reading','practice','submitted',?,?,?)",
        )
        .run(now, now, now);
      old.prepare("INSERT INTO responses VALUES(1,1,'TRUE','{}')").run();
      old.prepare("INSERT INTO scores VALUES(1,'reading',6.5)").run();
      old
        .prepare(
          "INSERT INTO activity_events(attempt_id,title,occurred_at,duration_seconds) VALUES(1,'Legacy reading',?,180)",
        )
        .run(now);
      old
        .prepare(
          "INSERT INTO study_tasks(title,scheduled_date) VALUES('Legacy task',date('now','localtime'))",
        )
        .run();
    } finally {
      old.close();
    }
    const { client } = await connection();
    for (const [id, phone] of [
      [anna, annaPhone],
      [dana, danaPhone],
    ] as const) {
      await client.execute({
        sql: "INSERT INTO users(id,phone_number,phone_verified_at,created_at,updated_at) VALUES(?,?,?,?,?)",
        args: [id, phone, now, now, now],
      });
    }
  });
  afterAll(async () => {
    const state = globalThis as typeof globalThis & {
      studioDatabase?: ReturnType<typeof connection>;
    };
    if (state.studioDatabase) (await state.studioDatabase).client.close();
    delete state.studioDatabase;
    vi.unstubAllEnvs();
  });

  test("upgrades a populated previous schema while keeping its history private", async () => {
    for (const userId of [anna, dana]) {
      const data = await getDashboard(userId);
      expect(data.studyMinutes).toBe(0);
      expect(data.activity).toHaveLength(7);
      expect(data.recent).toEqual([]);
      expect(data.dueTasks).toEqual([]);
      expect(data.skillBands.reading).toBeNull();
      expect((await getSettings(userId)).theme).toBe("system");
    }
    const catalog = await getLibrary();
    expect(catalog.map((m) => m.slug)).toEqual(
      expect.arrayContaining([
        "a-cooler-station",
        "shared-gardens",
        "a-place-to-concentrate",
        "comparing-figures",
      ]),
    );
    expect((await getMaterial("a-cooler-station"))?.questions).toHaveLength(3);
    expect(
      (await getMaterial("a-cooler-station"))?.questions[0],
    ).not.toHaveProperty("accepted");
    expect(await getMaterial("missing")).toBeNull();
  });

  test("isolates preferences across accounts and persists atomic changes", async () => {
    await updateSettings(anna, {
      theme: "dark",
      targetBand: 7.5,
      examDate: "2027-04-20",
    });
    await Promise.all([
      updateSettings(anna, { dailyMinutes: 45 }),
      updateSettings(anna, { displayName: "Anna" }),
      getDashboard(anna),
    ]);
    expect(await getSettings(anna)).toMatchObject({
      dailyMinutes: 45,
      displayName: "Anna",
      theme: "dark",
    });
    expect(await getSettings(dana)).toMatchObject({
      dailyMinutes: 30,
      displayName: "",
      theme: "system",
    });
    await expect(updateSettings(anna, { targetBand: 7.2 })).rejects.toThrow();
    await expect(
      updateSettings(anna, { apiKey: "forbidden" } as Parameters<
        typeof updateSettings
      >[1]),
    ).rejects.toThrow();
    const reopened = await openDatabase(filename);
    try {
      expect(
        (
          await reopened.client.execute({
            sql: "SELECT target_band FROM user_settings WHERE user_id=?",
            args: [anna],
          })
        ).rows[0].target_band,
      ).toBe(7.5);
      expect(
        (await reopened.client.execute("PRAGMA foreign_key_check")).rows,
      ).toHaveLength(0);
    } finally {
      reopened.client.close();
    }
    await updateSettings(anna, { targetBand: null, examDate: null });
    expect((await getSettings(anna)).examDate).toBeNull();
  });

  test("attempts and answers are scoped to an account, material and editable state", async () => {
    const id = (await createAttempt(anna, 1))!;
    expect(await saveAnswer(anna, id, 1, "TRUE")).toBe(true);
    expect(await getAttempt(dana, id)).toBeNull();
    expect(await saveAnswer(dana, id, 1, "FALSE")).toBe(false);
    expect(await saveAnswer(anna, id, 4, "different material")).toBe(false);
    const own = await getAttempt(anna, id);
    expect(own?.answers).toEqual([{ questionId: 1, answer: "TRUE" }]);
    const { client } = await connection();
    await client.execute({
      sql: "UPDATE user_attempts SET state='submitted',submitted_at=? WHERE id=? AND user_id=?",
      args: [now, id, anna],
    });
    expect(await saveAnswer(anna, id, 1, "late")).toBe(false);
    expect((await getDashboard(dana)).resume).toBeNull();
  });

  test("private recordings cannot be fetched or overwritten from a second account", async () => {
    const id = (await createAttempt(dana, 3))!;
    const audio = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
    expect(await saveRecording(dana, id, "audio/webm;codecs=opus", audio)).toBe(
      true,
    );
    expect(await getRecording(anna, id)).toBeNull();
    expect(
      await saveRecording(anna, id, "audio/webm", new Uint8Array([1])),
    ).toBe(false);
    expect(await getRecording(dana, id)).toEqual({
      mime: "audio/webm",
      bytes: audio,
    });
    expect(await saveRecording(dana, id, "text/html", audio)).toBe(false);
    const { client } = await connection();
    await expect(
      client.execute({
        sql: "INSERT INTO user_activity(user_id,attempt_id,title,occurred_at,duration_seconds) VALUES(?,?,?,?,?)",
        args: [anna, id, "cross-owner", now, 60],
      }),
    ).rejects.toThrow();
  });

  test("local legacy import is atomic, idempotent and bound to a single verified recipient", async () => {
    const { client } = await connection();
    await expect(claimLegacy(client, "+12025550136")).rejects.toThrow();
    expect(await claimLegacy(client, danaPhone, true)).toBe(true);
    expect(await claimLegacy(client, danaPhone, true)).toBe(false);
    await expect(claimLegacy(client, annaPhone)).rejects.toThrow();
    const data = await getDashboard(dana, 30);
    expect(data.activity).toHaveLength(30);
    expect(data.activity.at(-1)?.minutes).toBe(3);
    expect(data.studyMinutes).toBe(3);
    expect(data.streak).toBe(1);
    expect(data.recent.map((r) => r.title)).toEqual(["Legacy reading"]);
    expect(data.skillBands.reading).toBe(6.5);
    expect(data.latestMockBand).toBeNull();
    expect(data.dueTasks[0]?.title).toBe("Legacy task");
    expect((await getSettings(dana)).theme).toBe("dark");
    expect((await getDashboard(anna)).studyMinutes).toBe(0);
    expect(
      (
        await client.execute(
          "SELECT count(*) n FROM attempts WHERE profile_id=1",
        )
      ).rows[0].n,
    ).toBe(1);
  });

  test("backup reopens independently with verified integrity", async () => {
    const { client } = await connection();
    const file = filename + ".backup";
    await client.execute({ sql: "VACUUM INTO ?", args: [file] });
    const saved = new DatabaseSync(file, { readOnly: true });
    try {
      expect(
        saved.prepare("PRAGMA integrity_check").get()?.integrity_check,
      ).toBe("ok");
      expect(saved.prepare("SELECT count(*) n FROM users").get()?.n).toBe(2);
      expect(
        saved.prepare("SELECT count(*) n FROM materials").get()?.n,
      ).toBeGreaterThanOrEqual(4);
    } finally {
      saved.close();
    }
  });
});

test("grading respects normalized verified variants and word limits", () => {
  expect(gradeAnswer("  NEW   benches ", ["new benches"], 2)).toBe(true);
  expect(gradeAnswer("the new benches", ["the new benches"], 2)).toBe(false);
  expect(gradeAnswer("not given", ["NOT GIVEN"])).toBe(true);
  expect(gradeAnswer("false", ["TRUE"])).toBe(false);
  expect(gradeAnswer("", [""])).toBe(false);
});
