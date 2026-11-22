import { connection } from "@/server/db/connection";
import { getDashboard, getSettings } from "@/server/db";
import { gradeAnswer } from "@/lib/grading";
import type { HistoryPage, TutorMode, Turn } from "@/features/tutor/contracts";
import { feedbackSchema } from "@/features/tutor/contracts";

export async function tutorHistory(
  userId: number,
  mode: TutorMode,
  before = Number.MAX_SAFE_INTEGER,
  limit = 12,
): Promise<HistoryPage> {
  const { client } = await connection();
  const { rows } = await client.execute({
    sql: `SELECT id,question,reply FROM tutor_turns
    WHERE user_id=? AND mode=? AND id<? ORDER BY id DESC LIMIT ?`,
    args: [userId, mode, before, limit + 1],
  });
  return {
    hasOlder: rows.length > limit,
    turns: rows
      .slice(0, limit)
      .reverse()
      .map((r) => ({
        id: Number(r.id),
        question: String(r.question),
        reply: String(r.reply),
      })),
  };
}

export async function saveTurn(
  userId: number,
  requestId: string,
  mode: TutorMode,
  question: string,
  reply: string,
): Promise<Turn> {
  const { client } = await connection();
  const result = await client.execute({
    sql: `INSERT INTO tutor_turns(user_id,request_id,mode,question,reply,created_at)
    VALUES(?,?,?,?,?,?) RETURNING id`,
    args: [userId, requestId, mode, question, reply, Date.now()],
  });
  return { id: Number(result.rows[0].id), question, reply };
}

export async function priorTurn(userId: number, requestId: string) {
  const { client } = await connection();
  const row = (
    await client.execute({
      sql: "SELECT id,question,reply FROM tutor_turns WHERE user_id=? AND request_id=?",
      args: [userId, requestId],
    })
  ).rows[0];
  return row
    ? {
        id: Number(row.id),
        question: String(row.question),
        reply: String(row.reply),
      }
    : null;
}

export async function tutoringContext(userId: number) {
  const { client } = await connection();
  const [settings, progress, records, reviews] = await Promise.all([
    getSettings(userId),
    getDashboard(userId),
    client.execute({
      sql: `SELECT r.answer,r.snapshot,m.title FROM user_responses r
      JOIN user_attempts a ON a.id=r.attempt_id AND a.user_id=r.user_id
      JOIN materials m ON m.id=a.material_id WHERE r.user_id=? AND a.state='submitted'
      ORDER BY a.submitted_at DESC,r.question_id LIMIT 18`,
      args: [userId],
    }),
    client.execute({
      sql: `SELECT feedback FROM user_ai_reviews WHERE user_id=? AND feedback IS NOT NULL ORDER BY reviewed_at DESC LIMIT 3`,
      args: [userId],
    }),
  ]);
  const mistakes = records.rows
    .flatMap((row) => {
      try {
        const s = JSON.parse(String(row.snapshot));
        if (
          !Array.isArray(s.accepted) ||
          !s.accepted.every((a: unknown) => typeof a === "string") ||
          gradeAnswer(String(row.answer), s.accepted, s.maxWords ?? undefined)
        )
          return [];
        return [
          {
            material: String(row.title),
            question: String(s.prompt).slice(0, 300),
            answer: String(row.answer).slice(0, 180),
            explanation: String(s.explanation).slice(0, 240),
          },
        ];
      } catch {
        return [];
      }
    })
    .slice(0, 4);
  const recentSuggestions = reviews.rows.flatMap((r) => {
    const parsed = feedbackSchema.safeParse(JSON.parse(String(r.feedback)));
    return parsed.success ? parsed.data.grammarTopics.slice(0, 2) : [];
  });
  return {
    settings,
    context: {
      targetBand: settings.targetBand,
      dailyMinutes: settings.dailyMinutes,
      activityMinutesThisWeek: progress.studyMinutes,
      skillEstimates: progress.skillBands,
      plan: progress.dueTasks
        .slice(0, 5)
        .map((t) => ({ activity: t.title, completed: t.done })),
      recentActivities: progress.recent.slice(0, 4).map((r) => r.title),
      mistakes,
      recentSuggestions,
    },
  };
}
