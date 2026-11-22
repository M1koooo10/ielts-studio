import {redirect} from "next/navigation";
import {requireAuth} from "@/server/auth/current";
import {listeningAudio} from "@/server/content/listening-audio";
import {needsInitialKey} from "@/server/auth/initial-key";
import {getSessionStatus} from "@/server/ai/status";
import {loadPlacement,report} from "@/server/placement/store";
import {PlacementTest} from "@/features/placement/Test";
import {ResultActions} from "@/features/placement/ResultActions";
import {SessionPanel} from "@/features/settings/SessionPanel";
import {LogoutButton} from "@/features/auth/AccountForms";
import {Recorder} from "@/features/placement/Recorder";
import {speakingPrompts} from "@/lib/placement/model";
import "@/features/settings/settings.css";
import "./placement.css";

export const metadata={title:"Входная диагностика IELTS"};
export default async function PlacementPage(){
  const user=await requireAuth();
  if(!user.displayName)redirect("/complete-profile");
  if(await needsInitialKey(user.userId))redirect("/onboarding");
  const data=await loadPlacement(user.userId), done=data.state.step===7;
  const result=done?report(data):null;
  const reviews=[...(data.writing??[]),...(data.speaking?[data.speaking]:[])];
  return <main className="placement"><header className="section-head"><b>IELTS Studio</b><LogoutButton/></header>
    {result?<section className="panel"><h1>Your Estimated IELTS Level</h1>
      <p>Your current level is an estimate based on a short diagnostic test, not an official IELTS result.</p>
      <h2>{result.overall===null?"Профиль навыков":"IELTS Band "+result.overall.toFixed(1)}</h2>
      <p>Уровень для подбора практики · <b>{result.level}</b>{result.overall===null?" · предварительно по Listening и Reading":""}</p>
      <div className="placement-grid">{Object.entries(result.scores).map(([skill,band])=><div className="panel" key={skill}><h3>{skill}</h3>
        {band!==null?<><strong>{band.toFixed(1)} / 9</strong><progress max={9} value={band}/></>:<p>{skill==="Speaking"&&data.state.recordings.length<3?"Текстовый режим · недостаточно аудио для балла":"Ожидает AI-проверки"}</p>}</div>)}</div>
      <p>Listening · {result.listening.correct}/10. Reading · {result.reading.correct}/10. Точность оценки ограничена длиной теста.{data.overtime&&" Использовалось дополнительное время."}</p>
      <p>Приоритет недели — {result.focus}. {result.listening.correct!==result.reading.correct&&"Выше доля верных ответов в "+(result.listening.correct>result.reading.correct?"Listening.":"Reading.")}</p>
      {reviews.map((r,i)=><div key={i}><h3>{i<2?"Writing · Task "+(i+1):"Speaking"}</h3><p>Сильная сторона · {r.strength}</p><p>Что улучшить · {r.weakness}</p><p>{r.recommendation}</p></div>)}
      <h2>Ваш план на неделю</h2><ol>{result.plan.map((t,i)=><li key={i}>{t}</li>)}</ol>
      {data.state.recordings.length<3&&<details><summary>Добавить недостающие устные ответы</summary>{speakingPrompts.map((prompts,i)=>data.state.recordings.includes(i+4)?null:<section key={i}><h3>Speaking · Part {i+1}</h3><ul>{prompts.map(p=><li key={p}>{p}</li>)}</ul><Recorder owner={user.userId} step={i+4} recorded={false} refresh/></section>)}</details>}
      <details><summary>Как считается оценка</summary><p>Для каждого набора из десяти вопросов используется локальная диагностическая шкала. Потолок этого Listening — 7, Reading — 8. Writing Task 2 весит вдвое больше Task 1. Общий балл — среднее четырёх оценок, округлённое до ближайшего полубалла. Соответствие CEFR ориентировочное.</p></details>
      {(!data.writing||(!data.speaking&&data.state.recordings.length===3))&&<><p>При AI-проверке тексты и сохранённые записи отправляются в OpenAI. Ответы можно проверить позже из кабинета.</p><SessionPanel initialStatus={await getSessionStatus()}/></>}
      <ResultActions completed={data.state.completed} review={!data.writing||(!data.speaking&&data.state.recordings.length===3)}/>
    </section>:<PlacementTest owner={user.userId} initial={data.state} audioSources={await Promise.all([1,2].map(async i=>(await listeningAudio(`/content/placement/exercise-${i}.wav`)).audio))}/>}
  </main>;
}
