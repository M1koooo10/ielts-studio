import {connection} from "../db/connection";

export async function needsInitialKey(userId:number) {
  const {client}=await connection();
  const row=await client.execute({sql:"SELECT needs_initial_ai_key FROM users WHERE id=?",args:[userId]});
  return Boolean(row.rows[0]?.needs_initial_ai_key);
}
export async function confirmInitialKey(userId:number) {
  const {client}=await connection();
  await client.execute({sql:"UPDATE users SET needs_initial_ai_key=0 WHERE id=? AND needs_initial_ai_key=1",args:[userId]});
}
