import {describe,expect,it} from "vitest";
import {stageQuestions,secondsLeft,type PlacementState} from "../src/lib/placement/model";
import {objective,report,rubric} from "../src/server/placement/store";
import keys from "../src/server/placement/keys.json";

describe("placement",()=>{
  const answers=Object.fromEntries([...stageQuestions(0),...stageQuestions(1)].map(q=>[q.id,q.options[keys[q.id-1]]]));
  const state:PlacementState={answers,step:7,cursor:0,opened:0,revision:1,recordings:[],completed:false};
  const base={state,writing:null,speaking:null,overtime:false};
  const review=(band:number)=>rubric.parse({criteria:Array(4).fill(band),strength:"clear",weakness:"detail",recommendation:"add examples"});
  it("grades all twenty keys and caps each diagnostic sample",()=>{
    expect(objective(answers,0)).toEqual({correct:10,band:7});
    expect(objective(answers,1)).toEqual({correct:10,band:8});
    expect(objective({},0).correct).toBe(0);
  });
  it("restores the countdown from the saved start and clamps overtime",()=>{
    expect(secondsLeft(0,1000,61000)).toBe(480);
    expect(secondsLeft(1,0,900000)).toBe(0);
  });
  it("waits for audio and writing before assigning an overall band",()=>{
    expect(report(base).overall).toBeNull();
    const result=report({...base,writing:[review(4),review(7)],speaking:review(5)});
    expect(result.scores.Writing).toBe(6);
    expect(result.overall).toBe(6.5);
    expect(result.plan[0]).toMatch(/Speaking/);
  });
  it("rejects invalid AI bands",()=>expect(()=>review(9.5)).toThrow());
});
