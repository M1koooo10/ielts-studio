import { getAuth } from "@/server/auth/current";
import { validOrigin, json } from "./origin";
import { createOpenAIClient } from "./provider";
import { keyring, type SessionStatus } from "./sessions";

export async function getSessionStatus(): Promise<SessionStatus> {
  return keyring.status(await getAuth());
}

/** Only the verified session cookie chooses the provider credential. */
export async function getAuthenticatedUserAIClient() {
  const owner = await getAuth();
  if (!owner) return null;
  const credential = keyring.credential(owner);
  if (!credential) return null;
  return {
    owner,
    client: createOpenAIClient(credential.key),
    signal: credential.signal,
  };
}

export async function authorizeWrite(
  request: Request,
): Promise<Response | null> {
  if (!validOrigin(request))
    return json({ error: "Источник запроса не разрешён." }, 403);
  if (!(await getAuth()))
    return json({ error: "Для этого действия войдите в аккаунт." }, 401);
  return null;
}
