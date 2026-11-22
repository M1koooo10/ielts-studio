import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "../db/connection";
import { ACCOUNT_COOKIE, resolveSession } from "./service";

export async function getAuth() {
  const token = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  if (!token) return null;
  const { client } = await connection();
  return resolveSession(client, token);
}

export async function requireAuth() {
  const auth = await getAuth();
  if (!auth) redirect("/welcome");
  return auth;
}
