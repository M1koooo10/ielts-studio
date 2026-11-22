import {estimateBand} from "../../lib/band";
import {listeningAudio} from "./listening-audio";
import { connection } from "../db/connection";
import { gradeAnswer } from "../../lib/grading";

import {z} from "zod";

export async function startPractice(owner:number,slug:string){
 const {client}=await connection();const tx=await client.transaction("write");
 try{
  const m=(await tx.execute({sql:"SELECT id,title FROM materials WHERE slug=? AND status='ready' ORDER BY version DESC LIMIT 1",args:[slug]})).rows[0];
  if(!m)return null;
  const active=(await tx.execute({sql:"SELECT id FROM user_attempts WHERE user_id=? AND material_id=? AND state='active' ORDER BY id DESC LIMIT 1",args:[owner,m.id]})).rows[0];
  if(active){await tx.commit();return Number(active.id)}
  const now=Date.now();const r=await tx.execute({sql:"INSERT INTO user_attempts(user_id,material_id,title,kind,state,started_at,updated_at) VALUES(?,?,?,'practice','active',?,?) RETURNING id",args:[owner,m.id,m.title,now,now]});
  await tx.commit();return Number(r.rows[0].id)
 }finally{tx.close()}
}
export async function loadPractice(owner:number,id:number){
 const {client}=await connection();
 const a=(await client.execute({sql:`SELECT a.id,a.state,a.material_id,m.title,m.slug,m.skill,m.body,m.instructions,m.minutes,l.cefr,
 COALESCE(w.text,'') essay, EXISTS(SELECT 1 FROM user_recordings WHERE user_id=a.user_id AND attempt_id=a.id) recorded
 FROM user_attempts a JOIN materials m ON m.id=a.material_id JOIN material_levels l ON l.material_id=m.id LEFT JOIN user_work w ON w.user_id=a.user_id AND w.attempt_id=a.id WHERE a.user_id=? AND a.id=?`,args:[owner,id]})).rows[0];
 if(!a)return null;
 const [s,q]=await client.batch([{sql:"SELECT id,title,body,image,audio,segments FROM bank_sections WHERE material_id=? ORDER BY position",args:[a.material_id]},
 {sql:`SELECT q.id,q.kind,q.prompt,q.options,q.max_words,i.section_id,i.audio_at,r.answer,k.accepted,k.evidence,k.explanation,mark.correct FROM questions q
 LEFT JOIN bank_items i ON q.id=i.question_id LEFT JOIN answer_keys k ON k.question_id=q.id
 LEFT JOIN user_responses r ON r.user_id=? AND r.attempt_id=? AND r.question_id=q.id
 LEFT JOIN user_marks mark ON mark.user_id=? AND mark.attempt_id=? AND mark.question_id=q.id WHERE q.material_id=? ORDER BY q.position`,args:[owner,id,owner,id,a.material_id]}],"read");
 const finished=a.state==="submitted";
 const cues=new Map<string,number>();
 for(const section of s.rows){
   if(!section.audio)continue;
   const generated=await listeningAudio(String(section.audio));
   const segments=JSON.parse(String(section.segments)) as {start:number;end:number;text:string}[];
   if(generated.times.length!==segments.length||!generated.times.length)continue;
   section.audio=generated.audio;
   section.segments=JSON.stringify(segments.map((segment,i)=>{
     for(const item of q.rows){
       const at=Number(item.audio_at);
       if(item.section_id===section.id&&item.audio_at!==null&&at>=segment.start&&at<segment.end){
         cues.set(String(item.id),generated.times[i].start);
       }
     }
     return {...segment,...generated.times[i]};
   }));
 }
 return {id,cefr:String(a.cefr),slug:String(a.slug),title:String(a.title),skill:String(a.skill),minutes:Number(a.minutes),instructions:String(a.instructions),finished,essay:String(a.essay),recorded:Boolean(a.recorded),
 sections:s.rows.length?s.rows.map(r=>({id:Number(r.id),title:String(r.title),body:String(r.body),image:r.image?String(r.image):null,audio:r.audio?String(r.audio):null,segments:JSON.parse(String(r.segments)) as {start:number;end:number;text:string}[]})):[{id:0,title:String(a.title),body:String(a.body),image:null,audio:null,segments:[]}],
 questions:q.rows.map(r=>({id:Number(r.id),section:Number(r.section_id??0),kind:String(r.kind),prompt:String(r.prompt),options:JSON.parse(String(r.options)) as string[],maxWords:r.max_words?Number(r.max_words):null,answer:String(r.answer??""),at:r.audio_at===null?null:Number(r.audio_at),
 review:finished?{accepted:JSON.parse(String(r.accepted??"[]")) as string[],correct:Boolean(r.correct),explanation:String(r.explanation??""),evidence:String(r.evidence??"")}:null}))};
}
export type Exercise=NonNullable<Awaited<ReturnType<typeof loadPractice>>>;
export const draftSchema=z.strictObject({answers:z.record(z.string().regex(/^\d+$/),z.string().max(2000)).refine(v=>Object.keys(v).length<=100),essay:z.string().max(40000),submit:z.boolean()});
export async function savePractice(owner:number,id:number,request:z.infer<typeof draftSchema>){
 const payload=draftSchema.parse(request);const {client}=await connection();const tx=await client.transaction("write");
 try{
  const a=(await tx.execute({sql:"SELECT a.*,m.skill,m.minutes FROM user_attempts a JOIN materials m ON m.id=a.material_id WHERE a.user_id=? AND a.id=?",args:[owner,id]})).rows[0];
  if(!a)return 404;
  if(a.state==="submitted")return payload.submit?200:409;
  if(a.state!=="active"&&a.state!=="interrupted")return 409;
  const qs=(await tx.execute({sql:"SELECT q.*,k.accepted,k.explanation,k.evidence FROM questions q JOIN answer_keys k ON q.id=k.question_id WHERE material_id=? ORDER BY position",args:[a.material_id]})).rows;
  if(Object.keys(payload.answers).some(key=>!qs.some(q=>String(q.id)===key)))return 400;
  if(a.skill==="writing"){
   if(payload.submit&&!payload.essay.trim())return 422;
   await tx.execute({sql:"INSERT INTO user_work(user_id,attempt_id,text) VALUES(?,?,?) ON CONFLICT(attempt_id) DO UPDATE SET text=excluded.text",args:[owner,id,payload.essay]});
  }
  if(a.skill==="speaking" && payload.submit && !(await tx.execute({sql:"SELECT 1 FROM user_recordings WHERE user_id=? AND attempt_id=?",args:[owner,id]})).rows.length)return 422;
  for(const q of qs){
   const answer=payload.answers[String(q.id)]??"";
   const options=JSON.parse(String(q.options)) as string[];
   if(answer&&options.length&&!options.includes(answer))return 400;
   await tx.execute({sql:"INSERT INTO user_responses(user_id,attempt_id,question_id,answer,snapshot) VALUES(?,?,?,?,?) ON CONFLICT(attempt_id,question_id) DO UPDATE SET answer=excluded.answer",args:[owner,id,q.id,answer,JSON.stringify({prompt:q.prompt,accepted:JSON.parse(String(q.accepted)),evidence:q.evidence,explanation:q.explanation})]});
   if(payload.submit)await tx.execute({sql:"INSERT INTO user_marks(user_id,attempt_id,question_id,correct) VALUES(?,?,?,?)",args:[owner,id,q.id,Number(gradeAnswer(answer,JSON.parse(String(q.accepted)),q.max_words?Number(q.max_words):undefined))]});
  }
  const now=Date.now();
  await tx.execute({sql:"UPDATE user_attempts SET state=?,submitted_at=?,updated_at=? WHERE user_id=? AND id=?",args:[payload.submit?"submitted":"active",payload.submit?now:null,now,owner,id]});
  if(payload.submit){await tx.execute({sql:"INSERT INTO user_activity(user_id,attempt_id,title,occurred_at,duration_seconds) VALUES(?,?,?,?,?)",args:[owner,id,a.title,now,Math.max(0,Math.min(Number(a.minutes)*60,Math.floor((now-Number(a.started_at))/1000)))]});}
  if(payload.submit && qs.length===40 && (a.skill==="reading"||a.skill==="listening")){
    const ed=(await tx.execute({sql:"SELECT kind FROM material_editions WHERE material_id=?",args:[a.material_id]})).rows[0];
    if(ed?.kind==="full-test"){
      const count=(await tx.execute({sql:"SELECT sum(correct) n FROM user_marks WHERE user_id=? AND attempt_id=?",args:[owner,id]})).rows[0];
      const band=estimateBand(Number(count.n),qs.length);
      await tx.execute({sql:"INSERT INTO user_scores(user_id,attempt_id,scope,band) VALUES(?,?,?,?)",args:[owner,id,a.skill,band]});
    }
  }
  await tx.commit();return 200;
 }finally{tx.close()}
}
export async function browsePractice(owner:number,skill:string){
 const {client}=await connection();const r=await client.execute({sql:`SELECT m.slug,m.title,m.description,m.minutes,e.kind,e.topic,e.difficulty,l.cefr,
 (SELECT group_concat(DISTINCT kind) FROM questions WHERE material_id=m.id) types,
 (SELECT COUNT(*) FROM user_attempts a WHERE a.user_id=? AND a.material_id=m.id AND a.state='submitted') completed,
 (SELECT COUNT(*) FROM user_marks x JOIN user_attempts a ON a.user_id=x.user_id AND a.id=x.attempt_id WHERE x.user_id=? AND a.material_id=m.id AND x.correct=0) mistakes
 FROM materials m JOIN material_levels l ON l.material_id=m.id LEFT JOIN material_editions e ON e.material_id=m.id WHERE m.skill=? AND m.status='ready' ORDER BY m.title`,args:[owner,owner,skill]});
 return r.rows.map(x=>({slug:String(x.slug),title:String(x.title),description:String(x.description),minutes:Number(x.minutes),kind:String(x.kind??"practice"),topic:String(x.topic??""),difficulty:String(x.difficulty??""),cefr:String(x.cefr??""),types:String(x.types??"").split(",").filter(Boolean),completed:Number(x.completed),mistakes:Number(x.mistakes)}));
}
export async function practiceHistory(owner:number,skill:string){
 const {client}=await connection();const r=await client.execute({sql:"SELECT a.id,a.title,a.state,a.updated_at FROM user_attempts a JOIN materials m ON m.id=a.material_id WHERE a.user_id=? AND m.skill=? ORDER BY a.updated_at DESC LIMIT 20",args:[owner,skill]});return r.rows.map(a=>({id:Number(a.id),title:String(a.title),state:String(a.state),date:new Date(Number(a.updated_at)).toLocaleDateString("ru-RU")}));
}
