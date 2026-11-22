"use client";
import {useState} from "react";
export function ResultActions({completed,review}:{completed:boolean;review:boolean}){
  const [busy,setBusy]=useState(""),[error,setError]=useState("");
  async function run(action:string){
    setBusy(action);setError("");
    try{
      const response=await fetch("/api/placement?action="+action,{method:"POST"});
      if(!response.ok)throw Error((await response.json()).error);
      window.location.replace(action==="finish"?"/":"/placement");
    }catch(e){setError((e as Error).message);setBusy("");}
  }
  return <><div className="work-actions">{review&&<button className="studio-button btn-outline" disabled={!!busy} onClick={()=>void run("evaluate")}>{busy==="evaluate"?"Проверяем ответы…":"Оценить ответы с AI"}</button>}
    <button className="studio-button btn-blue" disabled={!!busy} onClick={()=>void run("finish")}>{completed?"Открыть кабинет":"Start My Learning Journey"}</button></div>
    <p role="alert">{error}</p></>;
}
