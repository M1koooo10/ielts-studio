import {getAuth} from "@/server/auth/current";import {validOrigin,json} from "@/server/ai/origin";import {saveRecording,getRecording} from "@/server/db/attempts";
type C={params:Promise<{id:string}>};
export async function GET(_:Request,c:C){const a=await getAuth();if(!a)return json({error:"Требуется вход."},401);const id=Number((await c.params).id);const r=Number.isSafeInteger(id)?await getRecording(a.userId,id):null;return r?new Response(new Uint8Array(r.bytes),{headers:{"Content-Type":r.mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}}):json({error:"Запись недоступна."},404)}
export async function POST(req:Request,c:C){if(!validOrigin(req))return json({error:"Недопустимый источник."},403);const a=await getAuth();if(!a)return json({error:"Требуется вход."},401);
 const id=Number((await c.params).id);if(!Number.isSafeInteger(id))return json({error:"Неверная попытка."},404);
 const max=24*1024*1024;const reader=req.body?.getReader();if(!reader)return json({error:"Отсутствует запись."},400);const parts:Uint8Array[]=[];let bytes=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>max){await reader.cancel();return json({error:"Запись превышает 24 МБ."},413)}parts.push(value)}}finally{reader.releaseLock()}
 return await saveRecording(a.userId,id,req.headers.get("content-type")??"",Buffer.concat(parts))?json({ok:true}):json({error:"Запись недоступна или формат не поддерживается."},400)
}
