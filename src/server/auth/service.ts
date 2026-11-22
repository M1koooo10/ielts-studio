import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";
import {
  AuthError,
  maskedPhone,
  normalizedPhone,
  type SmsProvider,
} from "./sms";

export const ACCOUNT_COOKIE = "studio_account";
export const OTP_LIFETIME = 5 * 60_000;
const COOLDOWN = 60_000;
const HOUR = 3_600_000;
export const SESSION_LIFETIME = 12 * HOUR;
const failed = () =>
  new AuthError(
    400,
    "Код неверен, просрочен или уже использован. Проверьте его или запросите новый.",
  );
export const sessionHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export interface AuthAccount {
  userId: number;
  sessionId: string;
  expiresAt: number;
  phoneMasked: string;
  displayName: string;
}

export async function resolveSession(
  db: Client,
  token?: string,
  now = Date.now(),
): Promise<AuthAccount | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = (
    await db.execute({
      sql: `
    SELECT s.id,s.user_id,s.expires_at,u.display_name,u.phone_number
    FROM auth_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at>?`,
      args: [sessionHash(token), now],
    })
  ).rows[0];
  return row
    ? {
        userId: Number(row.user_id),
        sessionId: String(row.id),
        expiresAt: Number(row.expires_at),
        displayName: String(row.display_name),
        phoneMasked: maskedPhone(String(row.phone_number)),
      }
    : null;
}

export async function revokeSession(
  db: Client,
  auth: AuthAccount,
  now = Date.now(),
) {
  await db.execute({
    sql: "UPDATE auth_sessions SET revoked_at=? WHERE id=? AND user_id=? AND revoked_at IS NULL",
    args: [now, auth.sessionId, auth.userId],
  });
}

export async function requestCode(
  db: Client,
  sms: SmsProvider,
  input: string,
  consent: boolean,
  now = Date.now(),
) {
  if (consent !== true)
    throw new AuthError(400, "Для отправки кода подтвердите согласие на SMS.");
  const phone = normalizedPhone(input);
  const id = randomUUID();
  const expiresAt = now + OTP_LIFETIME;

  // One SQL reservation accounts for concurrent requests and failed provider calls.
  const results = await db.batch(
    [
      {
        sql: "DELETE FROM otp_challenges WHERE created_at < ?",
        args: [now - 24 * HOUR],
      },
      {
        sql: `INSERT INTO otp_challenges(id,phone_number,created_at,consent_at,expires_at)
      SELECT ?,?,?,?,? WHERE
      NOT EXISTS(SELECT 1 FROM otp_challenges WHERE phone_number=? AND created_at>?)
      AND (SELECT COUNT(*) FROM otp_challenges WHERE phone_number=? AND created_at>?)<5
      AND (SELECT COUNT(*) FROM otp_challenges WHERE created_at>?)<30
      AND (SELECT COUNT(*) FROM otp_challenges WHERE created_at>?)<150`,
        args: [
          id,
          phone,
          now,
          now,
          expiresAt,
          phone,
          now - COOLDOWN,
          phone,
          now - HOUR,
          now - HOUR,
          now - 24 * HOUR,
        ],
      },
    ],
    "write",
  );
  if (!results[1].rowsAffected)
    throw new AuthError(
      429,
      "Достигнут лимит отправки SMS. Подождите перед новым запросом.",
      60,
    );
  const ref = await sms.start(phone);
  await db.batch(
    [
      {
        sql: "UPDATE otp_challenges SET provider_ref=? WHERE id=?",
        args: [ref, id],
      },
      {
        sql: "UPDATE otp_challenges SET closed_at=? WHERE phone_number=? AND created_at<? AND closed_at IS NULL",
        args: [now, phone, now],
      },
    ],
    "write",
  );
  return {
    challengeId: id,
    phoneMasked: maskedPhone(phone),
    retryAfter: COOLDOWN / 1000,
    expiresAt,
  };
}

export async function verifyCode(
  db: Client,
  sms: SmsProvider,
  id: string,
  code: string,
  clock = Date.now,
) {
  if (!/^\d{4,10}$/.test(code)) throw failed();
  const check = (
    await db.execute({
      sql: `UPDATE otp_challenges SET checks=checks+1
    WHERE id=? AND provider_ref IS NOT NULL AND expires_at>? AND closed_at IS NULL AND checks<5 RETURNING phone_number,provider_ref`,
      args: [id, clock()],
    })
  ).rows[0];
  if (
    !check ||
    !(await sms.approved(
      String(check.provider_ref),
      String(check.phone_number),
      code,
    ))
  )
    throw failed();

  const now = clock();
  const token = randomBytes(32).toString("hex");
  const tx = await db.transaction("write");
  try {
    const consumed = await tx.execute({
      sql: "UPDATE otp_challenges SET closed_at=? WHERE id=? AND expires_at>? AND closed_at IS NULL",
      args: [now, id, now],
    });
    if (!consumed.rowsAffected) throw failed();
    const person = (
      await tx.execute({
        sql: `INSERT INTO users(phone_number,phone_verified_at,created_at,updated_at)
        VALUES(?,?,?,?) ON CONFLICT(phone_number) DO UPDATE SET phone_verified_at=excluded.phone_verified_at, updated_at=excluded.updated_at
        RETURNING id,display_name`,
        args: [check.phone_number, now, now, now],
      })
    ).rows[0];
    await tx.execute({
      sql: "DELETE FROM auth_sessions WHERE expires_at<=?",
      args: [now],
    });
    await tx.execute({
      sql: "INSERT INTO auth_sessions(id,user_id,created_at,expires_at) VALUES(?,?,?,?)",
      args: [sessionHash(token), person.id, now, now + SESSION_LIFETIME],
    });
    await tx.commit();
    return { token, needsProfile: !String(person.display_name).trim() };
  } finally {
    tx.close();
  }
}
