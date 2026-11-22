import {z} from "zod";
import keys from "./keys.json";
import {connection} from "../db/connection";
import {day} from "../content/assessment";
import {cefr,countItems,half,stageQuestions,stages,type Draft,type PlacementState} from "../../lib/placement/model";

export const rubric=z.object({
  criteria:z.tuple([z.number(),z.number(),z.number(),z.number()]).refine(v=>v.every(x=>x>=0&&x<=9&&Number.isInteger(x*2))),
  strength:z.string().min(1), weakness:z.string().min(1), recommendation:z.string().min(1),
});
export type Review=z.infer<typeof rubric>;
export class PlacementError extends Error {
  constructor(message:string,readonly status=422){super(message);}
}
export async function loadPlacement(owner:number) {
  const {client}=await connection();
  const [rows,audio]=await client.batch([
    {sql:"SELECT * FROM placements WHERE user_id=?",args:[owner]},
    {sql:"SELECT step FROM placement_audio WHERE user_id=? ORDER BY step",args:[owner]},
  ],"read");
  const row=rows.rows[0];
  const state:PlacementState={step:Number(row?.step??-1),cursor:Number(row?.cursor??0),opened:Number(row?.opened_at??0),
    revision:Number(row?.revision??0),answers:JSON.parse(String(row?.answers??"{}")),recordings:audio.rows.map(r=>Number(r.step)),completed:!!row?.completed_at};
  return {state, writing:row?.writing?z.array(rubric).length(2).parse(JSON.parse(String(row.writing))):null,
    speaking:row?.speaking?rubric.parse(JSON.parse(String(row.speaking))):null,overtime:!!row?.overtime};
}
export const progressInput=z.object({step:z.number().int().min(-1).max(6),revision:z.number().int().nonnegative(),
  cursor:z.number().int().min(0).max(9),answers:z.record(z.string().max(12),z.string().max(16000)),advance:z.boolean()});
export async function updateProgress(owner:number,input:z.infer<typeof progressInput>) {
  const {client}=await connection();
  const tx=await client.transaction("write");
  try{
    await tx.execute({sql:"INSERT OR IGNORE INTO placements(user_id) VALUES(?)",args:[owner]});
    const row=(await tx.execute({sql:"SELECT * FROM placements WHERE user_id=?",args:[owner]})).rows[0];
    const step=Number(row.step);
    if(step!==input.step||row.revision!==input.revision) throw new PlacementError("Прогресс изменился на другом устройстве. Обновите страницу.",409);
    const answers:Draft=JSON.parse(String(row.answers));
    const required=step<0?[]:step<2?stageQuestions(step).map(q=>String(q.id)):[String(step<4?"w"+step:"s"+step)];
    for(const key of required){
      const value=input.answers[key];
      if(value===undefined) continue;
      if(step<2 && value!=="" && !stageQuestions(step).find(q=>String(q.id)===key)?.options.includes(value)) throw new PlacementError("Выберите ответ из списка.");
      answers[key]=value;
    }
    const now=Date.now();
    if(step>=0&&input.advance&&required.some(key=>!answers[key]?.trim())){
      const hasAudio=step>=4&&(await tx.execute({sql:"SELECT 1 FROM placement_audio WHERE user_id=? AND step=?",args:[owner,step]})).rows.length;
      if(!hasAudio) throw new PlacementError("Заполните ответы или сохраните запись перед продолжением.");
    }
    const next=step+(input.advance?1:0);
    const late=step>=0&&now>Number(row.opened_at)+stages[step].minutes*60000;
    await tx.execute({sql:`UPDATE placements SET step=?,cursor=?,answers=?,opened_at=?,revision=revision+1,
      started_at=coalesce(started_at,?),submitted_at=CASE WHEN ?=7 THEN ? ELSE submitted_at END,overtime=max(overtime,?) WHERE user_id=?`,
      args:[next,input.advance?0:Math.min(input.cursor,countItems(Math.max(0,step))-1),JSON.stringify(answers),input.advance?now:Number(row.opened_at),now,next,now,Number(late),owner]});
    await tx.commit();
  } finally {tx.close();}
  return (await loadPlacement(owner)).state;
}
export function objective(answers:Draft,step:number) {
  const correct=stageQuestions(step).filter(q=>answers[String(q.id)]===q.options[keys[q.id-1]]).length;
  // Local diagnostic anchors; the easy listening sample has a lower ceiling than academic reading.
  const scale=step===0?[1,2,2.5,3,3.5,4,4.5,5,5.5,6,7]:[1,2,2.5,3,3.5,4,5,5.5,6,7,8];
  return {correct,band:scale[correct]};
}
const mean=(r:Review)=>r.criteria.reduce((a,b)=>a+b,0)/4;
export function report(data:Awaited<ReturnType<typeof loadPlacement>>) {
  const listening=objective(data.state.answers,0),reading=objective(data.state.answers,1);
  const writing=data.writing?half((mean(data.writing[0])+2*mean(data.writing[1]))/3):null;
  const speaking=data.speaking?half(mean(data.speaking)):null;
  const scores={Listening:listening.band,Reading:reading.band,Writing:writing,Speaking:speaking};
  const ranked=Object.entries(scores).filter((p):p is [string,number]=>p[1]!==null).sort((a,b)=>a[1]-b[1]);
  const overall=writing!==null&&speaking!==null?half((listening.band+reading.band+writing+speaking)/4):null;
  const level=cefr(overall??(reading.band+listening.band)/2);
  const focus=ranked[0][0];
  const tasks:Record<string,string[]>={Listening:["выпишите три числа из короткого диалога","прослушайте интервью и объясните две позиции","выделите предположения и оговорки в лекции без расшифровки"],
    Reading:["подчеркните даты и имена в одном абзаце","найдите доказательства для пяти ответов True / False / Not Given","сопоставьте аргументы автора и контраргументы в академическом тексте"],
    Writing:["составьте пять предложений по таблице","напишите обзор таблицы и сравните два изменения","отредактируйте аргумент и добавьте оговорку в эссе"],
    Speaking:["запишите четыре предложения о себе","запишите двухминутный рассказ с примером","обоснуйте позицию и разберите контраргумент без подготовки"]};
  const practice=([skill,band]:[string,number])=>skill+" · "+cefr(band)+" — "+tasks[skill][band<4?0:band<6.5?1:2];
  const plan=[practice(ranked[0]),practice(ranked[1]),"Словарь "+level+" — выучите пять слов и пройдите тест",
    data.writing?.[1].recommendation??"Writing — напишите абзац с аргументом и примером",
    data.speaking?.recommendation??"Speaking — запишите ответ и проверьте, понятны ли ключевые слова",
    focus+" — повторите практику и исправьте две ошибки","Пройти еженедельный мини-тест IELTS"];
  return {scores,overall,level,focus,plan,listening,reading};
}
export async function publishPlan(owner:number) {
  const data=await loadPlacement(owner);
  if(data.state.step!==7) throw new PlacementError("Сначала завершите четыре раздела.");
  const result=report(data);
  const {client}=await connection();
  const tx=await client.transaction("write");
  try{
    const row=(await tx.execute({sql:"SELECT completed_at FROM placements WHERE user_id=?",args:[owner]})).rows[0];
    const date=new Date(Number(row.completed_at??Date.now()));
    const existing=await tx.execute({sql:"SELECT position,task_id FROM placement_plan WHERE user_id=?",args:[owner]});
    for(const [i,title] of result.plan.entries()){
      const previous=existing.rows.find(r=>Number(r.position)===i);
      if(previous) await tx.execute({sql:"UPDATE user_tasks SET title=? WHERE user_id=? AND id=? AND completed_at IS NULL",args:[title.slice(0,160),owner,previous.task_id]});
      else {
        const created=await tx.execute({sql:"INSERT INTO user_tasks(user_id,title,scheduled_date) VALUES(?,?,?) RETURNING id",args:[owner,title.slice(0,160),day(i===6?7:i,date)]});
        await tx.execute({sql:"INSERT INTO placement_plan VALUES(?,?,?)",args:[owner,i,created.rows[0].id]});
      }
    }
    await tx.execute({sql:"INSERT INTO user_assessments VALUES(?,0,?,?,?,?,?) ON CONFLICT(user_id,round) DO UPDATE SET taken_on=excluded.taken_on,level=excluded.level,score=excluded.score,total=excluded.total,focus=excluded.focus",
      args:[owner,day(0,date),result.level,result.listening.correct+result.reading.correct,20,result.focus]});
    await tx.execute({sql:"UPDATE placements SET completed_at=coalesce(completed_at,?),overall=? WHERE user_id=?",args:[date.getTime(),result.overall,owner]});
    await tx.commit();
  }finally{tx.close();}
}
