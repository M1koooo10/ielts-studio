import { z } from "zod";
import { json, validOrigin } from "./origin";
import { ProviderUnavailable, type AiProvider } from "./provider";
import type { Keyring, AccountSession } from "./sessions";

const command = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("connect"),
      provider: z.literal("openai"),
      key: z
        .string()
        .trim()
        .min(10)
        .max(2048)
        .regex(/^[!-~]+$/),
    })
    .strict(),
  z.object({ action: z.literal("offline") }).strict(),
  z.object({ action: z.literal("disconnect") }).strict(),
  z.object({ action: z.literal("test") }).strict(),
]);

async function readCommand(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let length = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    const result = command.safeParse(JSON.parse(body + decoder.decode()));
    return result.success ? result.data : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function handleSession(
  request: Request,
  resolveOwner: () => Promise<AccountSession | null>,
  ring: Keyring,
  provider: AiProvider,
  onConnected?: (userId:number)=>Promise<void>,
) {
  if (!validOrigin(request))
    return json({ error: "Источник запроса не разрешён." }, 403);
  const owner = await resolveOwner();
  if (!owner || ring.status(owner) === "new")
    return json({ error: "Войдите в аккаунт." }, 401);
  const data = await readCommand(request);
  if (!data)
    return json({ error: "Проверьте формат запроса и введённый ключ." }, 400);

  if (data.action === "offline" || data.action === "disconnect") {
    ring.disconnect(owner);
    return json({ status: "offline" });
  }
  const key =
    data.action === "connect" ? data.key : ring.credential(owner)?.key;
  if (!key) return json({ error: "Подключите OpenAI для проверки." }, 401);
  const revision = ring.begin(owner);
  try {
    await provider.validateKey(key);
  } catch (error) {
    const current = ring.finish(owner, revision);
    if (
      current &&
      error instanceof ProviderUnavailable &&
      error.status === 401 &&
      data.action === "test"
    ) {
      ring.disconnect(owner);
      return json({ status: "offline", error: "OpenAI отклонил ключ." }, 401);
    }
    return json(
      { error: "Не удалось подтвердить подключение OpenAI." },
      error instanceof ProviderUnavailable ? error.status : 503,
    );
  }
  const active = await resolveOwner();
  if (
    !active ||
    active.userId !== owner.userId ||
    active.sessionId !== owner.sessionId
  ) {
    ring.disconnect(owner);
    return json({ error: "Сессия завершена. Войдите снова." }, 401);
  }
  if (
    !ring.finish(active, revision, data.action === "connect" ? key : undefined)
  ) {
    return json(
      { error: "Состояние подключения изменилось. Обновите страницу." },
      409,
    );
  }
  if(data.action==="connect") await onConnected?.(active.userId);
  return json({
    status: "connected",
    message: "OpenAI подтвердил подключение.",
  });
}
