import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validOrigin } from "@/server/ai/origin";
import { revokeAI } from "@/server/ai/sessions";
import { connection } from "@/server/db/connection";
import {
  ACCOUNT_COOKIE,
  resolveSession,
  revokeSession,
} from "@/server/auth/service";
import { AuthError } from "@/server/auth/sms";

import { passwordAuth } from "@/server/auth/password";
export const runtime = "nodejs";
const credentials = z.strictObject({phone:z.string().min(3).max(50),password:z.string().min(8).max(128)});
const profile = z.strictObject({
  displayName: z.string().trim().min(1).max(60),
});
const empty = z.strictObject({});

function json(data: object, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function limitedJson(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new AuthError(415, "Ожидался JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError(400, "Проверьте заполненные поля.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2048) {
        await reader.cancel();
        throw new AuthError(413, "Запрос слишком большой.");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(400, "Некорректный JSON.");
  } finally {
    reader.releaseLock();
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  if (!validOrigin(request))
    return json({ error: "Источник запроса не разрешён." }, 403);
  const { action } = await context.params;
  try {
    const input = await limitedJson(request);
    const { client } = await connection();
    const oldToken = request.cookies.get(ACCOUNT_COOKIE)?.value;
    const cookie = {
      httpOnly: true,
      secure: request.headers.get("origin")!.startsWith("https://"),
      sameSite: "strict" as const,
      path: "/",
    };
    if (action === "login" || action === "register") {
      const {phone,password} = credentials.parse(input);
      const old = await resolveSession(client, oldToken);
      const {token,needsProfile} = await passwordAuth(client, phone, password, action === "register");
      if (old) {
        await revokeSession(client, old);
        revokeAI(old);
      }
      const response = json({ needsProfile });
      response.cookies.set(ACCOUNT_COOKIE, token, cookie);
      return response;
    }
    if (action === "logout") {
      empty.parse(input);
      const old = await resolveSession(client, oldToken);
      if (old) {
        await revokeSession(client, old);
        revokeAI(old);
      }
      const response = json({ ok: true });
      response.cookies.set(ACCOUNT_COOKIE, "", { ...cookie, maxAge: 0 });
      return response;
    }
    if (action === "profile") {
      const { displayName } = profile.parse(input);
      const old = await resolveSession(client, oldToken);
      if (!old) throw new AuthError(401, "Войдите по номеру телефона.");
      const changed = await client.execute({
        sql: `UPDATE users SET display_name=?,updated_at=?
        WHERE id=? AND EXISTS (SELECT 1 FROM auth_sessions WHERE id=? AND user_id=users.id AND revoked_at IS NULL AND expires_at>?)`,
        args: [displayName, Date.now(), old.userId, old.sessionId, Date.now()],
      });
      if (!changed.rowsAffected)
        throw new AuthError(401, "Сессия завершена. Войдите снова.");
      return json({ ok: true });
    }
    return json({ error: "Страница не найдена." }, 404);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        { error: "Проверьте поля. Пароль должен содержать от 8 до 128 символов." },
        400,
      );
    if (error instanceof AuthError) {
      const response = json(
        { error: error.message, retryAfter: error.retryAfter },
        error.status,
      );
      if (error.retryAfter)
        response.headers.set("Retry-After", String(error.retryAfter));
      return response;
    }
    return json(
      { error: "Вход временно недоступен. Повторите попытку позже." },
      503,
    );
  }
}
