"use client";
import {useEffect,useRef,useState} from "react";

async function localAudio(key:string,operation:"read"|"write"|"clear",blob?:Blob):Promise<Blob|undefined>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open("ielts-placement-audio",1);
    request.onupgradeneeded=()=>request.result.createObjectStore("drafts");
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction("drafts",operation==="read"?"readonly":"readwrite"),store=tx.objectStore("drafts");
    const req=operation==="read"?store.get(key):operation==="clear"?store.delete(key):store.put(blob,key);
    tx.oncomplete=()=>resolve(operation==="read"?req.result:undefined);tx.onerror=()=>reject(tx.error);
  });}finally{db.close();}
}
async function wav(blob:Blob){
  const ctx=new AudioContext();
  try{
    const decoded=await ctx.decodeAudioData(await blob.arrayBuffer());
    const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000);
    const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
    const samples=(await offline.startRendering()).getChannelData(0);
    const out=new ArrayBuffer(44+samples.length*2),v=new DataView(out);
    function label(at:number,text:string){for(let i=0;i<text.length;i++)v.setUint8(at+i,text.charCodeAt(i));}
    label(0,"RIFF");v.setUint32(4,out.byteLength-8,true);label(8,"WAVE");label(12,"fmt ");
    v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);
    v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);label(36,"data");v.setUint32(40,samples.length*2,true);
    samples.forEach((s,i)=>v.setInt16(44+i*2,Math.max(-1,Math.min(1,s))*32767,true));
    return new Blob([out],{type:"audio/wav"});
  }finally{await ctx.close();}
}
export function Recorder({owner,step,recorded,lock,refresh=false}:{owner:number;step:number;recorded:boolean;lock?:(v:boolean)=>void;refresh?:boolean}){
  const key=owner+"-"+step, url="/api/placement?action=audio&step="+step;
  const recorder=useRef<MediaRecorder|null>(null),alive=useRef(true),stopTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const [saved,setSaved]=useState(recorded),[pending,setPending]=useState<Blob>(),[status,setStatus]=useState(""),[busy,setBusy]=useState(false),[running,setRunning]=useState(false);
  useEffect(()=>{alive.current=true;void localAudio(key,"read").then(b=>{if(alive.current&&b)setPending(b);}).catch(()=>{});
    return()=>{alive.current=false;clearTimeout(stopTimer.current);if(recorder.current?.state==="recording")recorder.current.stop();};},[key]);
  async function upload(raw:Blob){
    setBusy(true);lock?.(true);
    try{
      const bytes=await wav(raw);
      const r=await fetch(url,{method:"POST",body:bytes,headers:{"Content-Type":"audio/wav"}});if(!r.ok)throw Error();
      await localAudio(key,"clear").catch(()=>{});setSaved(true);setPending(undefined);setStatus("Запись сохранена в профиле.");
      if(refresh)window.location.reload();
    }catch{setPending(raw);setStatus("Запись ожидает отправки. Проверьте соединение и повторите.");}
    finally{setBusy(false);lock?.(false);}
  }
  async function start(){
    setBusy(true);lock?.(true);let stream:MediaStream|undefined;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!alive.current){stream.getTracks().forEach(t=>t.stop());return;}
      const rec=new MediaRecorder(stream);recorder.current=rec;const chunks:Blob[]=[];
      rec.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);void localAudio(key,"write",new Blob(chunks,{type:rec.mimeType})).catch(()=>{});}};
      rec.onstop=async()=>{clearTimeout(stopTimer.current);stream?.getTracks().forEach(t=>t.stop());
        const raw=new Blob(chunks,{type:rec.mimeType});await localAudio(key,"write",raw).catch(()=>{});
        if(alive.current){setRunning(false);await upload(raw);}
      };
      rec.start(3000);setRunning(true);setStatus("Идёт запись.");
      stopTimer.current=setTimeout(()=>{if(rec.state==="recording")rec.stop();},120000);
    }catch{stream?.getTracks().forEach(t=>t.stop());setBusy(false);lock?.(false);setStatus("Микрофон недоступен. Разрешите доступ или введите ответ текстом.");}
  }
  return <div><button className="studio-button btn-outline" disabled={busy&&!running} onClick={()=>running?recorder.current?.stop():void start()}>{running?"Остановить и сохранить":"Записать ответ"}</button>
    {saved&&<audio controls src={url}/>}<p role="status">{status}</p>
    {pending&&<button disabled={busy} onClick={()=>void upload(pending)}>Повторить отправку записи</button>}
  </div>;
}
