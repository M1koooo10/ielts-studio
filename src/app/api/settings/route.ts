import {getAuth} from "@/server/auth/current";
import { NextResponse } from "next/server";
import { settingsPatchSchema } from "@/lib/contracts";
import { authorizeWrite } from "@/server/ai/status";
import { updateSettings } from "@/server/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denial = await authorizeWrite(request);
  if (denial) return denial;
  if (
    request.headers.get("content-type")?.split(";")[0] !== "application/json"
  ) {
    return NextResponse.json(
      { error: "Ожидались настройки в формате JSON." },
      { status: 415 },
    );
  }
  const payload: unknown = await request.json().catch(() => null);
  const parsed = settingsPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте значения полей в настройках." },
      { status: 400 },
    );
  }
  const account = await getAuth(); if(!account)return NextResponse.json({error:"Требуется вход."},{status:401}); const settings = await updateSettings(account.userId,parsed.data);
  return NextResponse.json(
    { saved: true, settings },
    { headers: { "Cache-Control": "no-store" } },
  );
}
