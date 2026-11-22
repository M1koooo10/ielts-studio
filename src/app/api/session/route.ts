import { getAuth } from "@/server/auth/current";
import { handleSession } from "@/server/ai/handle-session";
import { openaiProvider } from "@/server/ai/provider";
import { keyring } from "@/server/ai/sessions";
import { getSessionStatus } from "@/server/ai/status";
import { json } from "@/server/ai/origin";
import {confirmInitialKey} from "@/server/auth/initial-key";

export const runtime = "nodejs";
export async function GET() {
  const status = await getSessionStatus();
  return status === "new"
    ? json({ error: "Войдите в аккаунт." }, 401)
    : json({ status });
}
export async function POST(request: Request) {
  return handleSession(request, getAuth, keyring, openaiProvider, confirmInitialKey);
}
