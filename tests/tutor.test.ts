import {afterAll,beforeAll,describe,expect,inject,it,vi} from "vitest";
import {connection} from "../src/server/db/connection";
import {tutorHistory,saveTurn,tutoringContext} from "../src/server/ai/tutor-store";
import {evaluateAttempt} from "../src/server/ai/evaluation";
import {getFeedback} from "../src/server/ai/feedback-store";
const mock=vi.hoisted(()=>({owner:1,parse:vi.fn(),transcribe:vi.fn()}));
vi.mock("@/server/auth/current",()=>({getAuth:async()=>({userId:mock.owner,sessionId:"s"+mock.owner})}));
vi.mock("@/server/ai/status",()=>({getAuthenticatedUserAIClient:async()=>({owner:{userId:mock.owner,sessionId:"s"+mock.owner},
  signal:new AbortController().signal,client:{responses:{parse:mock.parse},audio:{transcriptions:{create:mock.transcribe}}}})}));
const fixture={band:6.5,comment:"A clear argument."};
const advice={strengths:["Clear structure"],recommendations:["Give evidence."],vocabulary:["urban land use"],corrections:[],grammarTopics:["Relative clauses"]};
describe("AI tutor and private review workflows",()=>{
 beforeAll(async()=>{
  vi.stubEnv("STUDIO_DB_PATH",inject("databaseTestFile")+".tutor.sqlite");
  const {client}=await connection();
  await client.batch([
   "INSERT INTO users(id,phone_number,phone_verified_at,created_at,updated_at) VALUES(1,'+14155550101',1,1,1),(2,'+14155550102',1,1,1)",
   "INSERT INTO user_attempts(id,user_id,material_id,title,kind,state,started_at,updated_at,submitted_at) VALUES(1,1,2,'essay','practice','submitted',1,2,2),(2,1,3,'talk','practice','submitted',1,2,2)",
   "INSERT INTO user_work(user_id,attempt_id,text) VALUES(1,1,'There are several shared gardens in my city.')",
   {sql:"INSERT INTO user_recordings(user_id,attempt_id,mime,audio) VALUES(1,2,'audio/webm',?)",args:[new Uint8Array([16,24,32])]}
  ],"write");
 });
 afterAll(async()=>{
  (await connection()).client.close();
  delete (globalThis as typeof globalThis & {studioDatabase?:unknown}).studioDatabase;vi.unstubAllEnvs();
 });
 it("separates conversation history by account and mode",async()=>{
  await saveTurn(1,"abc","coach","My question","My answer");
  expect((await tutorHistory(1,"coach")).turns).toHaveLength(1);
  expect((await tutorHistory(2,"coach")).turns).toEqual([]);
  expect((await tutorHistory(1,"lesson")).turns).toEqual([]);
 });
 it("blocks review of another account's submission before provider access",async()=>{
  mock.owner=2;await expect(evaluateAttempt(1)).rejects.toMatchObject({status:404});
  expect(mock.parse).not.toHaveBeenCalled();mock.owner=1;
 });
 it("persists structured writing estimates and includes verified material context",async()=>{
  mock.parse.mockResolvedValueOnce({output_parsed:{...advice,task:fixture,coherence:fixture,lexical:fixture,grammar:fixture}});
  const review=await evaluateAttempt(1);
  expect(review.feedback?.estimatedBand).toBe(6.5);expect(review.feedback?.criteria).toHaveLength(4);
  expect(mock.parse.mock.calls[0][0].input).toContain("shared gardens");
  expect(mock.parse.mock.calls[0][0].store).toBe(false);
  expect(await getFeedback(2,1)).toEqual({transcript:null,feedback:null});
  await evaluateAttempt(1);expect(mock.parse).toHaveBeenCalledTimes(1);
  expect((await tutoringContext(1)).context.recentSuggestions).toContain("Relative clauses");
  expect((await tutoringContext(2)).context.recentSuggestions).toEqual([]);
 });
 it("transcribes the saved file once, retains it on provider failure and omits unsupported speaking scores",async()=>{
  mock.transcribe.mockResolvedValueOnce({text:"I study by the river."});
  mock.parse.mockRejectedValueOnce(new Error("service unavailable"));
  await expect(evaluateAttempt(2)).rejects.toThrow();
  expect((await getFeedback(1,2)).transcript).toBe("I study by the river.");
  expect(mock.transcribe.mock.calls[0][0].file.size).toBe(3);
  mock.parse.mockResolvedValueOnce({output_parsed:{...advice,coherence:"Clear narrative.",lexical:fixture,grammar:fixture}});
  const f=(await evaluateAttempt(2)).feedback;
  expect(f?.estimatedBand).toBeNull();expect(f?.criteria.find(c=>c.name==="Pronunciation")?.band).toBeNull();expect(mock.transcribe).toHaveBeenCalledTimes(1);
 });
});
