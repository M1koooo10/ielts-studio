import type { Client } from "@libsql/client";

/** Invoked by a local operator only. The transaction either copies the entire profile or nothing. */
export async function claimLegacy(
  client: Client,
  phoneNumber: string,
  includePreferences = false,
) {
  const tx = await client.transaction("write");
  try {
    const user = (
      await tx.execute({
        sql: "SELECT id FROM users WHERE phone_number=? AND phone_verified_at > 0",
        args: [phoneNumber],
      })
    ).rows[0];
    if (!user) throw new Error("Нужен существующий подтверждённый аккаунт.");
    const userId = Number(user.id);
    const previous = (
      await tx.execute("SELECT user_id FROM legacy_claims WHERE profile_id=1")
    ).rows[0];
    if (previous) {
      if (Number(previous.user_id) !== userId)
        throw new Error("Архив уже перенесён в другой аккаунт.");
      return false;
    }
    await tx.execute({
      sql: "INSERT INTO legacy_claims VALUES(1,?,?)",
      args: [userId, Date.now()],
    });
    await tx.execute({
      sql: `INSERT INTO user_attempts(user_id,material_id,title,kind,state,started_at,updated_at,submitted_at,legacy_id)
      SELECT ?,material_id,title,kind,state,started_at,updated_at,submitted_at,id FROM attempts WHERE profile_id=1`,
      args: [userId],
    });
    await tx.execute({
      sql: `INSERT INTO user_responses SELECT a.user_id,a.id,r.question_id,r.answer,r.snapshot FROM responses r
      JOIN user_attempts a ON a.legacy_id=r.attempt_id WHERE a.user_id=?`,
      args: [userId],
    });
    await tx.execute({
      sql: `INSERT INTO user_scores SELECT a.user_id,a.id,s.scope,s.band FROM scores s
      JOIN user_attempts a ON a.legacy_id=s.attempt_id WHERE a.user_id=?`,
      args: [userId],
    });
    await tx.execute({
      sql: `INSERT INTO user_activity(user_id,attempt_id,title,occurred_at,duration_seconds)
      SELECT ?,a.id,e.title,e.occurred_at,e.duration_seconds FROM activity_events e
      LEFT JOIN user_attempts a ON a.legacy_id=e.attempt_id AND a.user_id=? WHERE e.profile_id=1`,
      args: [userId, userId],
    });
    await tx.execute({
      sql: `INSERT INTO user_tasks(user_id,title,scheduled_date,completed_at)
      SELECT ?,title,scheduled_date,completed_at FROM study_tasks WHERE profile_id=1`,
      args: [userId],
    });
    if (includePreferences) {
      await tx.execute({
        sql: `UPDATE user_settings SET (theme,ai_language,ai_model,voice_enabled,target_band,exam_date,daily_minutes) =
        (SELECT s.theme,s.ai_language,s.ai_model,s.voice_enabled,g.target_band,g.exam_date,g.daily_minutes FROM settings s
         JOIN study_goals g ON g.profile_id=s.profile_id WHERE s.profile_id=1) WHERE user_id=?`,
        args: [userId],
      });
    }
    await tx.commit();
    return true;
  } finally {
    tx.close();
  }
}
