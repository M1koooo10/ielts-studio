import { connection } from "@/server/db/connection";
import {
  feedbackSchema,
  type Feedback,
  type Review,
} from "@/features/tutor/contracts";

export async function reviewSource(userId: number, attemptId: number) {
  const { client } = await connection();
  const row = (
    await client.execute({
      sql: `
    SELECT m.skill,m.title,m.body,m.instructions,w.text AS work,
    (SELECT group_concat(title || char(10) || body,char(10)) FROM
      (SELECT title,body FROM bank_sections WHERE material_id=m.id ORDER BY position)) AS sections
    FROM user_attempts a
    JOIN materials m ON m.id=a.material_id
    LEFT JOIN user_work w ON w.user_id=a.user_id AND w.attempt_id=a.id
    WHERE a.user_id=? AND a.id=? AND a.state='submitted' AND m.skill IN ('writing','speaking')`,
      args: [userId, attemptId],
    })
  ).rows[0];
  return row
    ? {
        skill: String(row.skill) as "writing" | "speaking",
        title: String(row.title),
        body: [row.body,row.sections].filter(Boolean).join("\n\n"),
        instructions: String(row.instructions),
        work: String(row.work ?? ""),
      }
    : null;
}

export async function getFeedback(
  userId: number,
  attemptId: number,
): Promise<Review> {
  const { client } = await connection();
  const row = (
    await client.execute({
      sql: "SELECT transcript,feedback FROM user_ai_reviews WHERE user_id=? AND attempt_id=?",
      args: [userId, attemptId],
    })
  ).rows[0];
  return {
    transcript: row?.transcript ? String(row.transcript) : null,
    feedback: row?.feedback
      ? feedbackSchema.parse(JSON.parse(String(row.feedback)))
      : null,
  };
}

export async function saveTranscript(
  userId: number,
  attemptId: number,
  transcript: string,
) {
  const { client } = await connection();
  await client.execute({
    sql: `INSERT INTO user_ai_reviews(user_id,attempt_id,transcript,reviewed_at)
    SELECT user_id,id,?,? FROM user_attempts WHERE user_id=? AND id=? AND state='submitted'
    ON CONFLICT(attempt_id) DO UPDATE SET transcript=excluded.transcript WHERE user_ai_reviews.user_id=excluded.user_id`,
    args: [transcript, Date.now(), userId, attemptId],
  });
}

export async function saveFeedback(
  userId: number,
  attemptId: number,
  feedback: Feedback,
) {
  const { client } = await connection();
  const statements = [
    {
      sql: `INSERT INTO user_ai_reviews(user_id,attempt_id,feedback,reviewed_at)
    SELECT user_id,id,?,? FROM user_attempts WHERE user_id=? AND id=? AND state='submitted'
    ON CONFLICT(attempt_id) DO UPDATE SET feedback=excluded.feedback,reviewed_at=excluded.reviewed_at
    WHERE user_ai_reviews.user_id=excluded.user_id`,
      args: [JSON.stringify(feedback), Date.now(), userId, attemptId],
    },
  ];
  if (feedback.estimatedBand !== null)
    statements.push({
      sql: `INSERT INTO user_scores(user_id,attempt_id,scope,band)
    SELECT a.user_id,a.id,'writing',? FROM user_attempts a JOIN materials m ON m.id=a.material_id
    WHERE a.user_id=? AND a.id=? AND a.state='submitted' AND m.skill='writing'
    ON CONFLICT(attempt_id,scope) DO UPDATE SET band=excluded.band WHERE user_scores.user_id=excluded.user_id`,
      args: [feedback.estimatedBand, userId, attemptId],
    });
  await client.batch(statements, "write");
}
