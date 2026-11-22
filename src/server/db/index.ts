import { and, asc, desc, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import {
  examSkills,
  settingsPatchSchema,
  settingsSchema,
  type Dashboard,
  type ExamSkill,
  type Material,
  type Settings,
  type SettingsPatch,
} from "../../lib/contracts";
import { connection } from "./connection";
import { materials, materialLevels, questions, userSettings, users } from "./schema";

export async function getSettings(userId: number): Promise<Settings> {
  const { db } = await connection();
  const [row] = await db
    .select({
      displayName: users.displayName,
      targetBand: userSettings.targetBand,
      examDate: userSettings.examDate,
      dailyMinutes: userSettings.dailyMinutes,
      theme: userSettings.theme,
      aiLanguage: userSettings.aiLanguage,
      aiModel: userSettings.aiModel,
      voiceEnabled: userSettings.voiceEnabled,
    })
    .from(users)
    .innerJoin(userSettings, eq(userSettings.userId, users.id))
    .where(eq(users.id, userId));
  return settingsSchema.parse(row);
}

export async function updateSettings(
  userId: number,
  input: SettingsPatch,
): Promise<Settings> {
  const { displayName, ...preferences } = settingsPatchSchema.parse(input);
  const { db } = await connection();
  const updates: BatchItem<"sqlite">[] = [];
  if (displayName !== undefined) {
    if (!displayName.trim()) throw new Error("Введите имя профиля.");
    updates.push(
      db
        .update(users)
        .set({ displayName, updatedAt: Date.now() })
        .where(eq(users.id, userId)),
    );
  }
  if (Object.keys(preferences).length) {
    updates.push(
      db
        .update(userSettings)
        .set(preferences)
        .where(eq(userSettings.userId, userId)),
    );
  }
  const [first, ...rest] = updates;
  if (first) await db.batch([first, ...rest]);
  return getSettings(userId);
}
export async function getCatalogSummary(){
  const {db}=await connection();
  return db.select({slug:materials.slug,title:materials.title,skill:materials.skill,description:materials.description,minutes:materials.minutes,cefr:materialLevels.cefr}).from(materials).innerJoin(materialLevels,eq(materialLevels.materialId,materials.id)).where(eq(materials.status,"ready")).orderBy(asc(materials.id));
}
export async function getLibrary(slug?: string): Promise<Material[]> {
  const { db } = await connection();
  const rows = await db
    .select({material:materials,cefr:materialLevels.cefr})
    .from(materials)
    .innerJoin(materialLevels,eq(materialLevels.materialId,materials.id))
    .where(
      and(
        eq(materials.status, "ready"),
        slug ? eq(materials.slug, slug) : undefined,
      ),
    )
    .orderBy(desc(materials.version), asc(materials.id));
  const seen = new Set<string>();
  const result: Material[] = [];
  for (const {material:row,cefr} of rows) {
    if (seen.has(row.slug)) continue;
    seen.add(row.slug);
    const items = await db
      .select({
        kind: questions.kind,
        prompt: questions.prompt,
        options: questions.options,
      })
      .from(questions)
      .where(eq(questions.materialId, row.id))
      .orderBy(questions.position);
    result.push({
      slug: row.slug,
      cefr,
      title: row.title,
      skill: row.skill,
      description: row.description,
      body: row.body,
      instructions: row.instructions,
      minutes: row.minutes,
      questions: items,
    });
  }
  return result;
}

export async function getMaterial(slug: string): Promise<Material | null> {
  return (await getLibrary(slug))[0] ?? null;
}

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function calendarDay(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

export async function getDashboard(
  userId: number,
  days: 7 | 30 = 7,
): Promise<Dashboard> {
  const { client } = await connection();
  const now = new Date();
  const today = dateKey(now);
  const activity: Dashboard["activity"] = Array.from(
    { length: days },
    (_, index) => ({
      date: dateKey(calendarDay(now, index - days + 1)),
      minutes: 0,
    }),
  );
  const [sessions, dated, recent, tasks, resume, scores] = await client.batch(
    [
      {
        sql: "SELECT occurred_at, duration_seconds FROM user_activity WHERE user_id = ? AND occurred_at BETWEEN ? AND ?",
        args: [userId, calendarDay(now, 1 - days).getTime(), now.getTime()],
      },
      {
        sql: "SELECT DISTINCT date(occurred_at / 1000,'unixepoch','localtime') AS day FROM user_activity WHERE user_id = ? AND occurred_at <= ? AND duration_seconds > 0 ORDER BY day DESC",
        args: [userId, now.getTime()],
      },
      {
        args: [userId],
        sql: "SELECT id,title,occurred_at,duration_seconds FROM user_activity WHERE user_id = ? ORDER BY occurred_at DESC,id DESC LIMIT 6",
      },
      {
        sql: "SELECT id,title,completed_at FROM user_tasks WHERE user_id=? AND scheduled_date=? ORDER BY id",
        args: [userId, today],
      },
      {
        args: [userId],
        sql: "SELECT id,title FROM user_attempts WHERE user_id = ? AND state IN ('active','interrupted') ORDER BY updated_at DESC,id DESC LIMIT 1",
      },
      {
        args: [userId],
        sql: `WITH ranked AS (
       SELECT scope, band, ROW_NUMBER() OVER (PARTITION BY scope ORDER BY submitted_at DESC, a.id DESC) AS rn
       FROM user_scores s JOIN user_attempts a ON a.id=s.attempt_id AND a.user_id=s.user_id
       WHERE a.user_id = ? AND state='submitted' AND (scope != 'overall' OR kind = 'full_mock')
     ) SELECT scope,band FROM ranked WHERE rn = 1`,
      },
    ],
    "read",
  );
  const dailySeconds = new Map<string, number>();
  let seconds = 0;
  for (const row of sessions.rows) {
    const stamp = dateKey(new Date(Number(row.occurred_at)));
    const duration = Number(row.duration_seconds);
    dailySeconds.set(stamp, (dailySeconds.get(stamp) ?? 0) + duration);
    seconds += duration;
  }
  for (const entry of activity)
    entry.minutes = Math.round((dailySeconds.get(entry.date) ?? 0) / 60);
  const activeDays = new Set(dated.rows.map((row) => String(row.day)));
  let streak = 0;
  const first = activeDays.has(today) ? 0 : -1;
  while (activeDays.has(dateKey(calendarDay(now, first - streak)))) streak++;
  const skillBands: Dashboard["skillBands"] = {
    reading: null,
    listening: null,
    writing: null,
    speaking: null,
  };
  let latestMockBand: number | null = null;
  for (const score of scores.rows) {
    const scope = String(score.scope);
    if (scope === "overall") latestMockBand = Number(score.band);
    else if (examSkills.includes(scope as ExamSkill))
      skillBands[scope as ExamSkill] = Number(score.band);
  }
  return {
    skillBands,
    latestMockBand,
    studyMinutes: Math.round(seconds / 60),
    streak,
    activity,
    recent: recent.rows.map((row) => ({
      id: Number(row.id),
      title: String(row.title),
      date: dateKey(new Date(Number(row.occurred_at))),
      minutes: Math.round(Number(row.duration_seconds) / 60),
    })),
    dueTasks: tasks.rows.map((row) => ({
      id: Number(row.id),
      title: String(row.title),
      done: row.completed_at !== null,
    })),
    resume: resume.rows[0]
      ? { id: Number(resume.rows[0].id), title: String(resume.rows[0].title) }
      : null,
  };
}
