import {createHash} from "node:crypto";
import {readFile,stat,realpath} from "node:fs/promises";
import path from "node:path";
import type {Client} from "@libsql/client";
import {z} from "zod";
import {editionSchema,validateEdition} from "../../lib/bank-schema";

export async function importBatch(db:Client,input:unknown,publicRoot=path.resolve("public")){
 const rows=z.array(editionSchema).min(1).parse(input);
 const ids=new Set<string>();const root=await realpath(publicRoot);
 for(const row of rows){
   const key=row.slug+"@"+row.version;
   if(ids.has(key))throw Error("Duplicate edition "+key);ids.add(key);validateEdition(row);
   if(row.status==="ready")for(const s of row.sections)for(const asset of [s.audio,s.image].filter((x):x is string=>!!x)){
     const filename=await realpath(path.resolve(root,"."+asset));
     if(!filename.startsWith(root+path.sep)||!(await stat(filename)).isFile()) throw Error("Invalid asset "+asset);
     const content=await readFile(filename);
     if(!content.length)throw Error("Empty asset "+asset);
     if(asset===s.audio && asset.toLowerCase().endsWith(".wav")){
       if(content.length<44||content.toString("ascii",0,4)!=="RIFF"||content.toString("ascii",8,12)!=="WAVE")throw Error("Invalid WAV "+asset);
       let rate=0,size=0;
       for(let i=12;i+8<=content.length;){const n=content.readUInt32LE(i+4);if(i+8+n>content.length)throw Error("Truncated WAV");const chunk=content.toString("ascii",i,i+4);if(chunk==="fmt "&&n>=16)rate=content.readUInt32LE(i+16);if(chunk==="data")size=n;i+=8+n+(n%2);}
       if(!rate||!size||s.segments.some(t=>t.end>size/rate+.15))throw Error("Transcript exceeds WAV duration "+asset);
     }
   }
 }
 const tx=await db.transaction("write");let inserted=0;
 try{
  for(const row of rows){
   const document=JSON.stringify(row),digest=createHash("sha256").update(document).digest("hex");
   const old=(await tx.execute({sql:"SELECT e.digest FROM materials m LEFT JOIN material_editions e ON m.id=e.material_id WHERE slug=? AND version=?",args:[row.slug,row.version]})).rows[0];
   if(old){if(old.digest!==digest)throw Error("Edition already exists; increase version: "+row.slug);continue}
   const current=(await tx.execute({sql:"SELECT max(version) AS v FROM materials WHERE slug=?",args:[row.slug]})).rows[0];
   if(current.v!==null && Number(current.v)>=row.version)throw Error("Version must increase: "+row.slug);
   if(["ready","archived"].includes(row.status))await tx.execute({sql:"UPDATE materials SET status='archived' WHERE slug=? AND status='ready'",args:[row.slug]});
   const m=await tx.execute({sql:"INSERT INTO materials(slug,version,skill,title,description,body,instructions,minutes,status) VALUES(?,?,?,?,?,?,?,?,?) RETURNING id",args:[row.slug,row.version,row.skill,row.title,row.description,row.sections.map(s=>s.body).join("\n\n"),row.instructions,row.minutes,row.status==="needs_review"?"draft":row.status]});
   const mid=m.rows[0].id;
   await tx.execute({sql:"INSERT INTO material_editions VALUES(?,?,?,?,?,?,?,?,?,?)",args:[mid,digest,row.source,row.license,row.status,row.kind,row.topic,row.difficulty,row.cefr??null,document]});
   let pos=0;
   for(const [index,s] of row.sections.entries()){
     const entry=await tx.execute({sql:"INSERT INTO bank_sections(material_id,external_id,position,title,body,image,audio,segments) VALUES(?,?,?,?,?,?,?,?) RETURNING id",args:[mid,s.id,index,s.title,s.body,s.image??null,s.audio??null,JSON.stringify(s.segments)]});
     for(const q of s.questions){
       const item=await tx.execute({sql:"INSERT INTO questions(material_id,position,kind,prompt,options,max_words) VALUES(?,?,?,?,?,?) RETURNING id",args:[mid,++pos,q.kind,q.prompt,JSON.stringify(q.options),q.maxWords??null]});
       const qid=item.rows[0].id;await tx.execute({sql:"INSERT INTO answer_keys VALUES(?,?,?,?)",args:[qid,JSON.stringify(q.accepted),q.explanation,q.evidence]});
       await tx.execute({sql:"INSERT INTO bank_items VALUES(?,?,?,?)",args:[qid,entry.rows[0].id,q.id,q.at??null]});
     }
   }
   inserted++;
  }
  await tx.commit();return {inserted,unchanged:rows.length-inserted};
 }finally{tx.close()}
}
