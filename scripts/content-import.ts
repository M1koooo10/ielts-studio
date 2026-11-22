import path from "node:path";
import {readdir,readFile} from "node:fs/promises";
import {openDatabase} from "../src/server/db/connection";
import {importBatch} from "../src/server/content/import";
async function main(){
 const base=path.resolve("content");const inputs=process.argv.slice(2);
 const files=inputs.length?inputs:(await readdir(base,{recursive:true})).filter(f=>f.endsWith(".json")).sort().map(f=>path.join(base,f));
 const {client}=await openDatabase();try{for(const file of files){const data=JSON.parse((await readFile(file,"utf8")).replace(/^\uFEFF/,""));console.log(path.relative(process.cwd(),file),await importBatch(client,data))}}finally{client.close()}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Import failed");process.exitCode=1});
