import {createHash,randomUUID} from "node:crypto";
import {readFile,writeFile,mkdir,rename} from "node:fs/promises";
import path from "node:path";

const readJSON=async file=>JSON.parse(await readFile(file,"utf8"));
const sources=[];
for(const file of ["content/listening/listening-sets.json","content/levels/practice.json"]){
  for(const item of await readJSON(file))if(item.skill==="listening"){
    for(const section of item.sections)sources.push({audio:section.audio,lines:section.segments.map(s=>s.text),timing:section.segments});
  }
}
for(const [i,lines] of (await readJSON("scripts/placement-listening.json")).entries()){
  sources.push({audio:`/content/placement/exercise-${i+1}.wav`,lines,timing:[]});
}
const args=process.argv.slice(2), generate=args.includes("--generate");
const selected=args.filter(a=>a!=="--generate");
const tracks=selected.length?sources.filter(s=>selected.includes(path.basename(s.audio,".wav"))):sources;
if(!tracks.length||selected.some(a=>!tracks.some(s=>path.basename(s.audio,".wav")===a)))throw Error("Unknown track. Run without arguments to list available tracks.");
const voices=[process.env.ELEVENLABS_VOICE_ID||"21m00Tcm4TlvDq8ikWAM",process.env.ELEVENLABS_SECOND_VOICE_ID||"JBFqnCBsd6RMkjVDRZzb"];
const model="eleven_multilingual_v2";
function details(line){
  const role=/^([A-Za-z]+): /.exec(line);
  return {text:role?line.slice(role[0].length):line,voice:voices[["Student","Nora","Ben","Ruth","Lee","Lecturer"].includes(role?.[1])?1:0]};
}
const cache="data/elevenlabs-clips";
const output="public/content/elevenlabs";
function hash(value){return createHash("sha256").update(value).digest("hex");}
async function atomic(file,bytes){
  const tmp=file+"."+randomUUID()+".tmp";await writeFile(tmp,bytes);await rename(tmp,file);
}
async function pcm(line){
  const {text,voice}=details(line);
  const file=path.join(cache,hash(JSON.stringify([model,voice,text,"pcm_16000"]))+".pcm");
  try{return await readFile(file);}catch(e){if(e.code!=="ENOENT")throw e;}
  const response=await fetch("https://api.elevenlabs.io/v1/text-to-speech/"+encodeURIComponent(voice)+"?output_format=pcm_16000",{
    method:"POST",signal:AbortSignal.timeout(90000),headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({text,model_id:model})});
  if(!response.ok)throw Error("ElevenLabs HTTP "+response.status+"; check key, voice access and credits.");
  const bytes=Buffer.from(await response.arrayBuffer());
  if(!bytes.length||bytes.length%2||response.headers.get("content-type")?.includes("json"))throw Error("Invalid PCM response.");
  await atomic(file,bytes);return bytes;
}
function wav(pieces){
  const data=Buffer.concat(pieces),header=Buffer.alloc(44);
  header.write("RIFF");header.writeUInt32LE(data.length+36,4);header.write("WAVEfmt ",8);header.writeUInt32LE(16,16);
  header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(16000,24);header.writeUInt32LE(32000,28);
  header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write("data",36);header.writeUInt32LE(data.length,40);
  return Buffer.concat([header,data]);
}
for(const track of tracks){
  const id=path.basename(track.audio,".wav");
  console.log(id,track.lines.reduce((sum,line)=>sum+details(line).text.length,0),"characters");
  if(!generate)continue;
  if(!process.env.ELEVENLABS_API_KEY)throw Error("Set ELEVENLABS_API_KEY in .env.local before generating.");
  await mkdir(cache,{recursive:true});await mkdir(output,{recursive:true});
  const pieces=[],times=[];let offset=0;
  for(const [i,line] of track.lines.entries()){
    const bytes=await pcm(line);
    times.push({start:offset,end:offset+bytes.length/32000});
    pieces.push(bytes);
    const silence=track.timing[i+1]?Math.max(0,track.timing[i+1].start-track.timing[i].end):0.4;
    const padding=Buffer.alloc(Math.round(silence*16000)*2);
    pieces.push(padding);offset+=(bytes.length+padding.length)/32000;
  }
  const bytes=wav(pieces),name=id+"-"+hash(bytes).slice(0,16)+".wav";
  await atomic(path.join(output,name),bytes);
  await atomic(path.join(output,id+".json"),JSON.stringify({original:track.audio,audio:"/content/elevenlabs/"+name,times}));
}
