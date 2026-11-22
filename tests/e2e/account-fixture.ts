import {test as base, expect} from "@playwright/test";
import {randomBytes,createHash} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import path from "node:path";

export { expect };
// Seed only Playwright's disposable SQLite file; the running application has no test login endpoint.
export const test=base.extend<{signedIn:void;placed:boolean}>({
  placed:[true,{option:true}],
  signedIn:[async({context,placed},use)=>{
    const filename=process.env.STUDIO_E2E_DB;
    if(!filename||path.dirname(filename)!==path.resolve("test-results")||!/^db-[a-f0-9-]+\.sqlite$/.test(path.basename(filename)))throw Error("E2E database path required");
    const db=new DatabaseSync(filename);
    const now=Date.now();const token=randomBytes(32).toString("hex");
    try{
      db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000");
      const user=db.prepare("INSERT INTO users(phone_number,phone_verified_at,display_name,created_at,updated_at) VALUES(?,?,'Ученик',?,?)").run("+7"+randomBytes(5).readUIntBE(0,5).toString().slice(-10).padStart(10,"0"),now,now,now);
      if(placed){
        db.prepare("INSERT INTO placements(user_id,step,completed_at) VALUES(?,7,?)").run(user.lastInsertRowid,now);
        db.prepare("INSERT INTO user_assessments VALUES(?,0,date('now'),'B1',12,20,'Reading')").run(user.lastInsertRowid);
      }
      db.prepare("INSERT INTO auth_sessions(id,user_id,created_at,expires_at) VALUES(?,?,?,?)").run(createHash("sha256").update(token).digest("hex"),user.lastInsertRowid,now,now+3600000);
    }finally{db.close()}
    await context.addCookies([{name:"studio_account",value:token,url:"http://127.0.0.1:3417",httpOnly:true,sameSite:"Strict"}]);
    await use();
  },{auto:true}]
});
