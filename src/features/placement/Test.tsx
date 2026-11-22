"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {countItems,secondsLeft,speakingPrompts,stageQuestions,stages,transport,writingPrompts,type PlacementState} from "@/lib/placement/model";
import content from "@/lib/placement/content.json";
import {Recorder} from "./Recorder";

export function PlacementTest({owner,initial,audioSources}:{owner:number;initial:PlacementState;audioSources:string[]}){
  const [state,setState]=useState(initial), source=useRef(initial);
  const [draft,setDraft]=useState(initial.answers),answers=useRef(initial.answers);
  const [cursor,setCursor]=useState(initial.cursor),position=useRef(initial.cursor);
  const [busy,setBusy]=useState(false),[recording,setRecording]=useState(false),[status,setStatus]=useState("");
  const [now,setNow]=useState(Date.now),queue=useRef(Promise.resolve()),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const step=state.step,stage=stages[step],key="placement-draft-"+owner;
  const remember=useCallback(()=>{
    try{localStorage.setItem(key,JSON.stringify({step:source.current.step,revision:source.current.revision,answers:answers.current,cursor:position.current}));}catch{}
  },[key]);
  const save=useCallback((advance:boolean)=>{
    clearTimeout(timer.current);
    const requestedStep=source.current.step;
    const task=async()=>{
      const previous=source.current;
      if(previous.step!==requestedStep)return;
      const payload={step:previous.step,revision:previous.revision,cursor:position.current,answers:answers.current,advance};
      try{
        const response=await fetch("/api/placement",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
        const next=await response.json();if(!response.ok)throw Error(next.error);
        source.current=next;setState(next);
        if(advance){
          answers.current=next.answers;setDraft(next.answers);position.current=0;setCursor(0);setNow(Date.now());
          window.scrollTo(0,0);
        }
        if(advance||payload.answers===answers.current&&payload.cursor===position.current)localStorage.removeItem(key);
        else remember();
        setStatus("Ответы сохранены.");
        if(next.step===7)window.location.replace("/placement");
      }catch(error){setStatus(error instanceof TypeError?"Нет связи. Черновик остался на этом устройстве.":String((error as Error).message));}
      finally{if(advance)setBusy(false);}
    };
    queue.current=queue.current.then(task,task);return queue.current;
  },[key,remember]);
  useEffect(()=>{
    try{
      const local=JSON.parse(localStorage.getItem(key)??"null");
      if(local&&local.step===initial.step&&local.revision===initial.revision){
        queueMicrotask(()=>{answers.current=local.answers;setDraft(local.answers);position.current=local.cursor;setCursor(local.cursor);void save(false);});
      }
    }catch{}
    const online=()=>{if(source.current.step>=0)void save(false);};
    window.addEventListener("online",online);
    const tick=setInterval(()=>setNow(Date.now()),1000);
    return()=>{clearInterval(tick);clearTimeout(timer.current);window.removeEventListener("online",online);};
  },[initial,key,save]);
  function changed(){remember();setStatus("Сохраняем…");clearTimeout(timer.current);timer.current=setTimeout(()=>void save(false),450);}
  function edit(id:string,value:string){answers.current={...answers.current,[id]:value};setDraft(answers.current);changed();}
  function move(to:number){position.current=to;setCursor(to);changed();}
  function next(){setBusy(true);void save(true);}
  if(step<0)return <section className="panel"><h1>Входная диагностика IELTS Academic</h1><p>38 минут · четыре навыка</p>
    <p>Узнайте свой ориентировочный уровень и получите план на первую неделю. Каждый раздел можно продолжить с другого устройства после сохранения.</p>
    <div className="placement-grid">{[["Listening","9 минут · 10 вопросов"],["Reading","10 минут · 10 вопросов"],["Writing","12 минут · 2 текста"],["Speaking","7 минут · 3 части"]].map(([name,info])=><div className="panel" key={name}><strong>{name}</strong><p>{info}</p></div>)}</div>
    <p>Для устного ответа понадобится микрофон. Доступен и текстовый вариант. Для оценки письма и речи можно подключить OpenAI после теста.</p>
    <button className="studio-button btn-blue" disabled={busy} onClick={next}>Начать диагностику</button><p role="status">{status}</p></section>;
  if(!stage)return <p>Открываем результаты…</p>;
  const time=secondsLeft(step,state.opened,now),part=Math.floor(cursor/5),objective=step<2;
  const question=objective?stageQuestions(step)[cursor]:null;
  const total=countItems(step),id=(step<4?"w":"s")+step;
  return <section className="panel">
    <div className="section-head"><h1>{stage.title}</h1><b aria-label="Оставшееся время">{Math.floor(time/60)}:{String(time%60).padStart(2,"0")}</b></div>
    <label>Общий прогресс · этап {step+1} из 7 <progress max={7} value={step+cursor/total}/></label>
    <p>{stage.intro}</p>{!time&&<p role="status">Время истекло. Закончите ответ и продолжайте. Дополнительное время будет отмечено в результате.</p>}
    <fieldset disabled={busy} className="placement-field">
      {step===0&&<><h2>{part?"Urban Green Spaces":"Booking a Language Course"}</h2><audio key={part} controls preload="metadata" src={audioSources[part]}/></>}
      {step===1&&<article className="placement-passage" tabIndex={0} lang="en"><h2>{content.passages[part].title}</h2>{content.passages[part].text.split("\n\n").map(p=><p key={p}>{p}</p>)}</article>}
      {question&&<fieldset className="placement-field"><legend>{cursor+1} / 10 · {question.prompt}</legend>{question.options.map(option=><label className="placement-option" key={option}>
        <input type="radio" name={"q"+question.id} checked={draft[question.id]===option} onChange={()=>edit(String(question.id),option)}/> {option}</label>)}</fieldset>}
      {step===2&&<table><caption>Transport usage in a fictional city</caption><thead><tr><th>Transport</th><th>2010</th><th>2025</th></tr></thead><tbody>{transport.map(([type,a,b])=><tr key={type}><th>{type}</th><td>{a}%</td><td>{b}%</td></tr>)}</tbody></table>}
      {step>=2&&step<4&&<><h2 lang="en">{writingPrompts[step-2]}</h2><label>Ваш ответ<textarea maxLength={16000} value={draft[id]??""} onChange={e=>edit(id,e.target.value)}/></label>
        <small>Слов: {(draft[id]??"").trim().split(/\s+/).filter(Boolean).length}</small></>}
      {step>=4&&<><h2 lang="en">{speakingPrompts[step-4][cursor]}</h2>
        {step===5&&<p>{time>120?"Подготовка · "+(time-120)+" сек.":"Время для ответа"}</p>}
        <Recorder key={step} owner={owner} step={step} recorded={state.recordings.includes(step)} lock={setRecording}/>
        <details open={!!draft[id]}><summary>Ответить текстом без микрофона</summary><label>Ответы на вопросы этой части<textarea maxLength={16000} value={draft[id]??""} onChange={e=>edit(id,e.target.value)}/></label><small>Для оценки произношения и общего балла нужна запись всех трёх частей.</small></details></>}
    </fieldset>
    <div className="work-actions">
      {cursor>0&&<button disabled={busy} className="studio-button btn-outline" onClick={()=>move(cursor-1)}>Назад к вопросу</button>}
      {cursor<total-1?<button disabled={busy||(objective&&!draft[String(question?.id)])} className="studio-button btn-blue" onClick={()=>move(cursor+1)}>Следующий вопрос</button>
        :<button disabled={busy||recording} className="studio-button btn-blue" onClick={next}>{step===6?"Посмотреть результаты":"Продолжить · "+stages[step+1].title}</button>}
    </div><p role="status">{status}</p>
  </section>;
}
