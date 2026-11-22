import { connection } from "./connection";

export async function createAttempt(userId: number, materialId: number) {
  const { client } = await connection();
  const now = Date.now();
  const result = await client.execute({
    sql: `INSERT INTO user_attempts(user_id,material_id,title,kind,state,started_at,updated_at)
          SELECT ?,id,title,'practice','active',?,? FROM materials WHERE id=? AND status='ready' RETURNING id`,
    args: [userId, now, now, materialId],
  });
  return result.rows[0] ? Number(result.rows[0].id) : null;
}

export async function getAttempt(userId: number, attemptId: number) {
  const { client } = await connection();
  const [attempt, answers] = await client.batch(
    [
      {
        sql: "SELECT id,material_id,title,state,started_at,updated_at,submitted_at FROM user_attempts WHERE user_id=? AND id=?",
        args: [userId, attemptId],
      },
      {
        sql: "SELECT question_id,answer FROM user_responses WHERE user_id=? AND attempt_id=? ORDER BY question_id",
        args: [userId, attemptId],
      },
    ],
    "read",
  );
  const a = attempt.rows[0];
  if (!a) return null;
  return {
    id: Number(a.id),
    materialId: a.material_id === null ? null : Number(a.material_id),
    title: String(a.title),
    state: String(a.state),
    startedAt: Number(a.started_at),
    updatedAt: Number(a.updated_at),
    submittedAt: a.submitted_at === null ? null : Number(a.submitted_at),
    answers: answers.rows.map((r) => ({
      questionId: Number(r.question_id),
      answer: String(r.answer),
    })),
  };
}

export async function saveAnswer(
  userId: number,
  attemptId: number,
  questionId: number,
  answer: string,
) {
  if (answer.length > 20000) return false;
  const { client } = await connection();
  const [saved] = await client.batch(
    [
      {
        sql: `INSERT INTO user_responses(user_id,attempt_id,question_id,answer,snapshot)
          SELECT a.user_id,a.id,q.id,?,json_object('prompt',q.prompt,'kind',q.kind,'options',json(q.options),
            'accepted',json(k.accepted),'maxWords',q.max_words,'explanation',k.explanation,'evidence',k.evidence)
          FROM user_attempts a JOIN questions q ON q.material_id=a.material_id JOIN answer_keys k ON k.question_id=q.id
          WHERE a.user_id=? AND a.id=? AND q.id=? AND a.state IN ('active','interrupted')
          ON CONFLICT(attempt_id,question_id) DO UPDATE SET answer=excluded.answer`,
        args: [answer, userId, attemptId, questionId],
      },
      {
        sql: "UPDATE user_attempts SET updated_at=? WHERE id=? AND user_id=? AND changes()>0",
        args: [Date.now(), attemptId, userId],
      },
    ],
    "write",
  );
  return saved.rowsAffected === 1;
}

const audioTypes = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/wav",
  "audio/mpeg",
]);
export async function saveRecording(
  userId: number,
  attemptId: number,
  mime: string,
  bytes: Uint8Array,
) {
  const safeMime = mime.split(";")[0].trim().toLowerCase();
  if (
    !audioTypes.has(safeMime) ||
    !bytes.byteLength ||
    bytes.byteLength > 24 * 1024 * 1024
  )
    return false;
  const { client } = await connection();
  const [stored] = await client.batch(
    [
      {
        sql: `INSERT INTO user_recordings(user_id,attempt_id,mime,audio)
      SELECT a.user_id,a.id,?,? FROM user_attempts a JOIN materials m ON m.id=a.material_id
      WHERE a.user_id=? AND a.id=? AND m.skill='speaking' AND a.state IN ('active','interrupted')
      ON CONFLICT(attempt_id) DO UPDATE SET mime=excluded.mime,audio=excluded.audio`,
        args: [safeMime, bytes, userId, attemptId],
      },
      {
        sql: "UPDATE user_attempts SET updated_at=? WHERE id=? AND user_id=? AND changes()>0",
        args: [Date.now(), attemptId, userId],
      },
    ],
    "write",
  );
  return stored.rowsAffected === 1;
}

export async function getRecording(userId: number, attemptId: number) {
  const { client } = await connection();
  const row = (
    await client.execute({
      sql: "SELECT mime,audio FROM user_recordings WHERE user_id=? AND attempt_id=?",
      args: [userId, attemptId],
    })
  ).rows[0];
  return row
    ? {
        mime: String(row.mime),
        bytes: new Uint8Array(row.audio as ArrayBuffer),
      }
    : null;
}
