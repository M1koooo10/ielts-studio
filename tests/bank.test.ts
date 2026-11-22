import {beforeAll,afterAll,expect,test,inject,vi} from "vitest";
import path from "node:path";
import {readFile} from "node:fs/promises";
import {connection} from "../src/server/db/connection";
import {importBatch} from "../src/server/content/import";
import {editionSchema,validateEdition} from "../src/lib/bank-schema";
import {estimateBand} from "../src/lib/band";
import {loadPractice,startPractice,savePractice} from "../src/server/content/practice";
import {gradeAnswer} from "../src/lib/grading";

const original={slug:"museum-light",version:1,skill:"reading",title:"Museum Light",description:"An original sample.",minutes:3,topic:"design",difficulty:"foundation",kind:"passage",status:"ready",source:"IELTS Studio",license:"original",instructions:"Write one word.",sections:[{id:"a",title:"Light",body:"The gallery fitted blinds to the east windows.",questions:[{id:"one",kind:"short_answer",prompt:"What did the gallery fit?",accepted:["blinds"],maxWords:1,explanation:"The text names the new fittings.",evidence:"fitted blinds"}]}]};
beforeAll(async()=>{vi.stubEnv("STUDIO_DB_PATH",path.join(path.dirname(inject("databaseTestFile")),"bank-unit.sqlite"));const {client}=await connection();await client.execute("INSERT INTO users(id,phone_number,display_name,phone_verified_at,created_at,updated_at) VALUES(701,'+77010000001','Anna',1,1,1),(702,'+77010000002','Dan',1,1,1)")});
afterAll(async()=>{(await connection()).client.close();vi.unstubAllEnvs()});
test("imports immutable editions once, rolls back the whole batch on conflict, and validates keys and assets",async()=>{
 const {client}=await connection();expect(await importBatch(client,[original])).toEqual({inserted:1,unchanged:0});
 expect((await importBatch(client,[original])).unchanged).toBe(1);
 await expect(importBatch(client,[{...original,slug:"should-rollback"},{...original,title:"Different"}])).rejects.toThrow(/increase version/);
 expect((await client.execute("SELECT id FROM materials WHERE slug='should-rollback'")).rows).toHaveLength(0);
 const base=editionSchema.parse(original);const q=base.sections[0].questions[0];
 for(const invalid of [{options:["shades","awnings"]},{accepted:["the blinds"]},{evidence:"unrelated evidence"}]){
   expect(()=>validateEdition({...base,sections:[{...base.sections[0],questions:[{...q,...invalid}]}]})).toThrow()
 }
 expect(()=>validateEdition({...base,kind:"full-test"})).toThrow();
 await expect(importBatch(client,[{...original,slug:"no-visual",skill:"writing",kind:"task-1"}])).rejects.toThrow(/visual/);
});
test("saves and grades only the owner's responses, freezes submitted results and avoids duplicate activity",async()=>{
 const {client}=await connection();await importBatch(client,[original]);const id=(await startPractice(701,original.slug))!;
 const before=(await loadPractice(701,id))!;expect(before.questions[0].review).toBeNull();expect(await loadPractice(702,id)).toBeNull();
 const answers={[before.questions[0].id]:" BLINDS "};const draft={answers,essay:"",submit:false};
 expect(await savePractice(702,id,draft)).toBe(404);expect(await savePractice(701,id,draft)).toBe(200);
 expect(await startPractice(701,original.slug)).toBe(id);expect((await loadPractice(701,id))?.questions[0].answer).toBe(" BLINDS ");
 expect(await savePractice(701,id,{...draft,submit:true})).toBe(200);expect((await loadPractice(701,id))?.questions[0].review?.correct).toBe(true);
 expect(await savePractice(701,id,draft)).toBe(409);await savePractice(701,id,{...draft,submit:true});
 expect((await client.execute({sql:"SELECT count(*) n FROM user_activity WHERE user_id=? AND attempt_id=?",args:[701,id]})).rows[0].n).toBe(1);
});
test("grades timestamped listening answers and ties each to its actual transcript",()=>{
 const section={...original.sections[0],audio:"/content/listening/sample.wav",segments:[{start:0,end:4,text:original.sections[0].body}],questions:[{...original.sections[0].questions[0],at:1}]};
 const edition=editionSchema.parse({...original,skill:"listening",sections:[section]});expect(()=>validateEdition(edition)).not.toThrow();
 expect(gradeAnswer("blinds ",edition.sections[0].questions[0].accepted,1)).toBe(true);
 expect(gradeAnswer("the blinds",["blinds"],1)).toBe(false);
 expect(()=>validateEdition({...edition,sections:[{...edition.sections[0],questions:[{...edition.sections[0].questions[0],at:8}]}]})).toThrow(/timestamp/);
 expect(estimateBand(30,40)).toBe(7);expect(estimateBand(3,4)).toBeNull();
});
test("original task 1 dataset contains thirty usable chart files across seven formats",async()=>{
 const records=JSON.parse(await readFile("content/writing/visuals.json","utf8")) as unknown[];
 expect(records).toHaveLength(30);const formats=new Set<string>();
 for(const item of records){const row=editionSchema.parse(item);validateEdition(row);formats.add(row.slug.split("-")[1]);expect(await readFile(path.join("public",row.sections[0].image!),"utf8")).toContain("<svg")}
 expect(formats.size).toBe(7)
});
