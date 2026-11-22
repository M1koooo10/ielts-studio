import change from "../../../content/reading/reading-change.json";
import materials from "../../../content/reading/reading-materials.json";
import evidence from "../../../content/reading/reading-evidence.json";
import listening from "../../../content/listening/listening-sets.json";
import { gradeAnswer } from "../../lib/grading";
import { connection } from "../db/connection";

type Question = {prompt:string; options?:string[]; accepted:string[]; maxWords?:number};
type Section = {title:string; body?:string; audio?:string; questions:Question[]};
export function assessmentLevel(round:number) {
  if(round===0) return "A2–C1";
  const editions = [...materials,...evidence,...change].flatMap(unit=>unit.sections.map(()=>unit.difficulty));
  return editions[(round-1)%editions.length]==="advanced" ? "B2–C1" : "B2";
}
export function assessment(round:number): Section[] {
  const passages = [...materials, ...evidence, ...change].flatMap(unit => unit.sections);
  const recordings = listening.flatMap(unit => unit.sections);
  const passage = passages[(round-1) % passages.length];
  const recording = recordings[(round-1) % recordings.length];
  return [
    {title:"Чтение", body:passage.body, questions:passage.questions.slice(0,5)},
    {title:"Аудирование", audio:recording.audio, questions:recording.questions.slice(0,5)},
  ];
}

export function day(offset=0, base=new Date()) {
  const date = new Date(base);
  date.setDate(date.getDate()+offset);
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}
export async function assessmentHistory(userId:number) {
  const {client} = await connection();
  const result = await client.execute({sql:"SELECT * FROM user_assessments WHERE user_id=? ORDER BY round DESC",args:[userId]});
  return result.rows.map(row => ({
    round:Number(row.round), date:String(row.taken_on), level:String(row.level),
    score:Number(row.score), total:Number(row.total), focus:String(row.focus),
  }));
}
export function nextDate(last:{date:string}) {
  return day(7,new Date(last.date+"T12:00:00"));
}
export async function submitAssessment(userId:number, round:number, answers:FormData) {
  const history = await assessmentHistory(userId);
  const last = history[0];
  const today = day();
  if (!last || round < 1 || round !== (last ? last.round+1 : 0) || (last && today < nextDate(last))) return;
  const sections = assessment(round);
  const results = sections.map((section,s) => {
    const correct = section.questions.filter((q,i) => {
      const answer = answers.get(`answer-${s}-${i}`);
      if(typeof answer !== "string" || !answer.trim()) throw Error("Ответьте на все вопросы.");
      return gradeAnswer(answer,q.accepted,q.maxWords);
    }).length;
    return {title:section.title,correct,total:section.questions.length};
  });
  const total = results.reduce((sum,r)=>sum+r.total,0);
  const score = results.reduce((sum,r)=>sum+r.correct,0);
  const ratio = score/total;
  const level = ratio < 0.5 ? "Базовый" : ratio < 0.8 ? "Средний" : "Уверенный";
  const focus = results.reduce((a,b)=>a.correct/a.total <= b.correct/b.total ? a : b).title;
  const instruction = ratio < 0.5 ? "разберите пример и выполните 3 задания" : ratio < 0.8 ? "выполните 5 заданий и объясните ошибки" : "выполните 8 заданий на время и проверьте ответы";
  const titles = [
    focus+" — "+instruction, "Чтение — найдите основную мысль и два подтверждения в тексте",
    "Аудирование — запишите ключевые детали и проверьте их по расшифровке",
    "Письмо — составьте план эссе и напишите первый абзац",
    "Говорение — запишите ответ о своём городе и переслушайте его",
    focus+" — повторите задания, в которых ошиблись", "Пройти еженедельный мини-тест IELTS",
  ];
  const {client} = await connection();
  const tx = await client.transaction("write");
  try {
    const saved = await tx.execute({sql:"INSERT OR IGNORE INTO user_assessments VALUES(?,?,?,?,?,?,?)",args:[userId,round,today,level,score,total,focus]});
    if(saved.rowsAffected) {
      for(const [index,title] of titles.entries()) {
        await tx.execute({sql:"INSERT INTO user_tasks(user_id,title,scheduled_date) VALUES(?,?,?)",args:[userId,title,day(index===6?7:index,new Date(today+"T12:00:00"))]});
      }
    }
    await tx.commit();
  } finally {tx.close();}
}
