import type { Client } from "@libsql/client";
import { randomInt, randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  inject,
  test,
  vi,
} from "vitest";
import { openDatabase } from "../src/server/db/connection";
import {
  OTP_LIFETIME,
  requestCode,
  resolveSession,
  revokeSession,
  SESSION_LIFETIME,
  verifyCode,
} from "../src/server/auth/service";
import {
  normalizedPhone,
  smsProvider,
  type SmsProvider,
} from "../src/server/auth/sms";

// Only the test runner imports this double. Codes are generated for individual challenges.
class TestSms implements SmsProvider {
  messages = new Map<string, { phone: string; code: string }>();
  async start(phone: string) {
    const ref = randomUUID();
    this.messages.set(ref, { phone, code: String(randomInt(100000, 1000000)) });
    return ref;
  }
  async approved(ref: string, phone: string, code: string) {
    const message = this.messages.get(ref);
    return message?.phone === phone && message.code === code;
  }
  codeFor(phone: string) {
    return Array.from(this.messages.values())
      .filter((m) => m.phone === phone)
      .at(-1)!.code;
  }
}

describe("verified accounts", () => {
  let db: Client;
  const sms = new TestSms();
  const base = Date.UTC(2026, 2, 1);
  beforeAll(async () => {
    db = (await openDatabase(inject("databaseTestFile") + ".auth")).client;
  });
  afterAll(() => db?.close());
  test("normalizes international numbers and enforces recipient consent", async () => {
    expect(normalizedPhone("+1 (415) 555-0123")).toBe("+14155550123");
    expect(() => normalizedPhone("55501")).toThrow();
    expect(() => normalizedPhone("call +14155550123")).toThrow();
    await expect(
      requestCode(db, sms, "+14155550123", false, base),
    ).rejects.toMatchObject({ status: 400 });
    expect(sms.messages.size).toBe(0);
  });
  test("registers after verification, prevents replay, recognizes an existing account, and revokes sessions on logout", async () => {
    const phone = "+14155550123";
    const challenge = await requestCode(db, sms, phone, true, base);
    expect(
      (await db.execute("SELECT count(*) AS n FROM users")).rows[0].n,
    ).toBe(0);
    await expect(
      verifyCode(db, sms, challenge.challengeId, "000000", () => base + 100),
    ).rejects.toMatchObject({ status: 400 });
    const login = await verifyCode(
      db,
      sms,
      challenge.challengeId,
      sms.codeFor(phone),
      () => base + 200,
    );
    const owner = await resolveSession(db, login.token, base + 300);
    expect(owner).toMatchObject({
      phoneMasked: "+1 ••• ••• 0123",
      displayName: "",
    });
    expect(owner!.sessionId).not.toBe(login.token);
    expect(login.needsProfile).toBe(true);
    await expect(
      verifyCode(
        db,
        sms,
        challenge.challengeId,
        sms.codeFor(phone),
        () => base + 301,
      ),
    ).rejects.toMatchObject({ status: 400 });
    await db.execute({
      sql: "UPDATE users SET display_name='Learner' WHERE id=?",
      args: [owner!.userId],
    });
    await revokeSession(db, owner!, base + 400);
    expect(await resolveSession(db, login.token, base + 500)).toBeNull();
    const later = base + 61_000;
    const next = await requestCode(db, sms, phone, true, later);
    const signedIn = await verifyCode(
      db,
      sms,
      next.challengeId,
      sms.codeFor(phone),
      () => later + 1,
    );
    expect(signedIn.needsProfile).toBe(false);
    expect((await resolveSession(db, signedIn.token, later + 2))?.userId).toBe(
      owner!.userId,
    );
    expect(
      await resolveSession(db, signedIn.token, later + 1 + SESSION_LIFETIME),
    ).toBeNull();
    expect(
      (await db.execute("SELECT count(*) AS n FROM users")).rows[0].n,
    ).toBe(1);
    expect(
      (await db.execute("SELECT id FROM auth_sessions")).rows.map((r) => r.id),
    ).not.toContain(signedIn.token);
  });
  test("limits resend, expires a challenge and counts incorrect attempts", async () => {
    const p = "+14155550124",
      t = base + 2 * 3_600_000;
    const first = await requestCode(db, sms, p, true, t);
    await expect(requestCode(db, sms, p, true, t + 20)).rejects.toMatchObject({
      status: 429,
    });
    await expect(
      verifyCode(
        db,
        sms,
        first.challengeId,
        sms.codeFor(p),
        () => t + OTP_LIFETIME,
      ),
    ).rejects.toMatchObject({ status: 400 });
    const next = await requestCode(db, sms, p, true, t + OTP_LIFETIME);
    for (let i = 0; i < 5; i++)
      await expect(
        verifyCode(
          db,
          sms,
          next.challengeId,
          "000000",
          () => t + OTP_LIFETIME + 1,
        ),
      ).rejects.toMatchObject({ status: 400 });
    await expect(
      verifyCode(
        db,
        sms,
        next.challengeId,
        sms.codeFor(p),
        () => t + OTP_LIFETIME + 2,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  test("a replacement challenge supersedes the earlier code and parallel approvals create a single session", async () => {
    const phone = "+14155550125",
      t = base + 4 * 3_600_000;
    const old = await requestCode(db, sms, phone, true, t);
    const prior = sms.codeFor(phone);
    const fresh = await requestCode(db, sms, phone, true, t + 61_000);
    await expect(
      verifyCode(db, sms, old.challengeId, prior, () => t + 62_000),
    ).rejects.toMatchObject({ status: 400 });
    const results = await Promise.allSettled(
      Array.from({ length: 2 }, () =>
        verifyCode(
          db,
          sms,
          fresh.challengeId,
          sms.codeFor(phone),
          () => t + 62_000,
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  test("enforces global and per-recipient budgets and fails closed when SMS is unconfigured", async () => {
    const t = base + 48 * 3_600_000;
    for (let i = 0; i < 5; i++)
      await requestCode(db, sms, "+14155550126", true, t + 61_000 * i);
    await expect(
      requestCode(db, sms, "+14155550126", true, t + 61_000 * 5),
    ).rejects.toMatchObject({ status: 429 });
    for (let i = 0; i < 25; i++)
      await requestCode(
        db,
        sms,
        "+141555502" + String(i).padStart(2, "0"),
        true,
        t + 6 * 60_000,
      );
    await expect(
      requestCode(db, sms, "+14155550312", true, t + 7 * 60_000),
    ).rejects.toMatchObject({ status: 429 });
    vi.stubEnv("TWILIO_VERIFY_SERVICE_SID", "");
    try {
      expect(() => smsProvider()).toThrow(/не настроена/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
