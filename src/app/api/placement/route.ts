import {getAuth} from "@/server/auth/current";
import {needsInitialKey} from "@/server/auth/initial-key";
import {json,validOrigin} from "@/server/ai/origin";
import {boundedJSON,oncePending} from "@/server/ai/requests";
import {evaluatePlacement} from "@/server/placement/evaluate";
import {PlacementError,progressInput,publishPlan,updateProgress} from "@/server/placement/store";
import {connection} from "@/server/db/connection";

export async function POST(request:Request) {
  if(!validOrigin(request)) return json({error:"Недопустимый источник."},403);
  const auth=await getAuth();
  if(!auth) return json({error:"Войдите снова, чтобы отправить сохранённый ответ."},401);
  const owner=auth.userId;
  if(await needsInitialKey(owner))return json({error:"Перед диагностикой подключите OpenAI."},403);
  const url=new URL(request.url);
  try{
    switch(url.searchParams.get("action")){
      case "evaluate":{
        const done=await oncePending("placement:"+owner,async()=>{await evaluatePlacement(owner);return true;});
        if(!done) return json({error:"Проверка уже идёт."},409);
        return json({ok:true});
      }
      case "finish":await publishPlan(owner);return json({ok:true});
      case "audio":{
        const step=Number(url.searchParams.get("step"));
        if(![4,5,6].includes(step)||request.headers.get("content-type")!=="audio/wav") return json({error:"Нужна запись WAV."},422);
        const reader=request.body?.getReader();
        if(!reader) return json({error:"Нет записи."},422);
        const chunks:Uint8Array[]=[];let size=0;
        while(true){
          const {value,done}=await reader.read(); if(done) break;
          size+=value.length;
          if(size>8_000_000){await reader.cancel();return json({error:"Запись слишком длинная."},413);}
          chunks.push(value);
        }
        const bytes=Buffer.concat(chunks);
        if(bytes.length<48||bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WAVE")return json({error:"Не удалось прочитать аудиозапись."},422);
        const {client}=await connection();
        const result=await client.execute({sql:`INSERT OR REPLACE INTO placement_audio SELECT user_id,?,? FROM placements WHERE user_id=? AND
          (step=? OR (step=7 AND speaking IS NULL AND NOT EXISTS(SELECT 1 FROM placement_audio WHERE user_id=? AND step=?)))`,args:[step,bytes,owner,step,owner,step]});
        if(!result.rowsAffected) throw new PlacementError("Эта часть уже завершена.",409);
        return json({ok:true});
      }
      default:{
        const input=progressInput.safeParse(await boundedJSON(request,180000));
        if(!input.success) throw new PlacementError("Проверьте формат ответа.");
        return json(await updateProgress(owner,input.data));
      }
    }
  }catch(error){
    if(error instanceof PlacementError) return json({error:error.message},error.status);
    return json({error:"Не удалось завершить операцию. Сохранённые ответы доступны для повторной попытки."},503);
  }
}
export async function GET(request:Request){
  const auth=await getAuth();if(!auth)return json({},401);
  const step=Number(new URL(request.url).searchParams.get("step"));
  const {client}=await connection();
  const row=(await client.execute({sql:"SELECT data FROM placement_audio WHERE user_id=? AND step=?",args:[auth.userId,step]})).rows[0];
  if(!row)return json({},404);
  return new Response(new Uint8Array(row.data as ArrayBuffer),{headers:{"Content-Type":"audio/wav","Cache-Control":"no-store"}});
}
