import {readFile} from "node:fs/promises";
import path from "node:path";

type Timing={start:number;end:number};
export async function listeningAudio(original:string):Promise<{audio:string;times:Timing[]}>{
  const id=path.basename(original,".wav");
  try{
    const data=JSON.parse(await readFile(path.resolve("public/content/elevenlabs",id+".json"),"utf8"));
    if(data.original===original&&typeof data.audio==="string"&&Array.isArray(data.times))return data;
  }catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
  return {audio:original,times:[]};
}
