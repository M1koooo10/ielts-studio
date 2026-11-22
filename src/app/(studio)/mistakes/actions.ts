"use server";
import {requireAuth} from "@/server/auth/current";import {connection} from "@/server/db/connection";import {revalidatePath} from "next/cache";
export async function markReviewed(form:FormData){const a=await requireAuth();const {client}=await connection();await client.execute({sql:"UPDATE user_marks SET reviewed=? WHERE user_id=? AND attempt_id=? AND question_id=? AND correct=0",args:[form.get("resolved")==="1"?1:0,a.userId,Number(form.get("attempt")),Number(form.get("question"))]});revalidatePath("/mistakes")}
