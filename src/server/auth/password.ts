import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { Client } from "@libsql/client";
import { AuthError, normalizedPhone } from "./sms";
import { SESSION_LIFETIME, sessionHash } from "./service";

function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function passwordAuth(db: Client, input: string, password: string, register: boolean) {
  const phone = normalizedPhone(input);
  const now = Date.now();
  const windowStart = now - 15 * 60_000;
  const [, reservation] = await db.batch([
    { sql: "DELETE FROM password_attempts WHERE at <= ?", args: [windowStart] },
    { sql: `INSERT INTO password_attempts SELECT ?,? WHERE
        (SELECT count(*) FROM password_attempts WHERE phone=?) < 8
        AND (SELECT count(*) FROM password_attempts) < 120`, args: [phone, now, phone] },
  ], "write");
  if (!reservation.rowsAffected) throw new AuthError(429, "Слишком много попыток. Повторите через 15 минут.", 900);

  let user = (await db.execute({ sql: "SELECT id, display_name, password_hash FROM users WHERE phone_number=?", args: [phone] })).rows[0];
  const stored = typeof user?.password_hash === "string" ? user.password_hash : "";
  const [saltHex, hashHex] = stored.split(":");
  const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
  const hash = await derive(password, salt);

  if (register) {
    user = (await db.execute({
      sql: `INSERT INTO users(phone_number,phone_verified_at,created_at,updated_at,password_hash,needs_initial_ai_key)
        VALUES(?,0,?,?,?,1) ON CONFLICT(phone_number) DO NOTHING RETURNING id, display_name`,
      args: [phone, now, now, salt.toString("hex") + ":" + hash.toString("hex")],
    })).rows[0];
    if (!user) throw new AuthError(409, "Регистрация недоступна. Если у вас уже есть аккаунт, войдите.");
  } else {
    const expected = Buffer.from(hashHex ?? "", "hex");
    if (!user || expected.length !== hash.length || !timingSafeEqual(expected, hash)) {
      throw new AuthError(401, "Неверный номер телефона или пароль.");
    }
  }

  const token = randomBytes(32).toString("hex");
  await db.batch([
    { sql: "DELETE FROM auth_sessions WHERE expires_at<=?", args: [now] },
    { sql: "INSERT INTO auth_sessions(id,user_id,created_at,expires_at) VALUES(?,?,?,?)",
      args: [sessionHash(token), user.id, now, now + SESSION_LIFETIME] },
  ], "write");
  return { token, needsProfile: !String(user.display_name).trim() };
}
