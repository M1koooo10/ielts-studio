import {z} from "zod";
const text=z.string().trim().min(1);
const id=text.regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
const asset=text.regex(/^\/content\/[A-Za-z0-9_./-]+$/).refine(v=>!v.includes("..")&&!v.includes("//"));
export const bankQuestion=z.strictObject({id,kind:id,prompt:text,options:z.array(text).default([]),accepted:z.array(text).min(1),explanation:text,evidence:text,maxWords:z.number().int().positive().optional(),at:z.number().nonnegative().optional()});
const section=z.strictObject({id,title:text,body:text,image:asset.optional(),audio:asset.optional(),segments:z.array(z.strictObject({start:z.number().nonnegative(),end:z.number().positive(),text})).default([]),questions:z.array(bankQuestion).default([])});
export const editionSchema=z.strictObject({slug:id,version:z.number().int().positive(),skill:z.enum(["reading","listening","writing","speaking","grammar","vocabulary"]),title:text,description:text,minutes:z.number().int().min(1),topic:text,difficulty:z.enum(["foundation","intermediate","advanced"]),kind:id,status:z.enum(["draft","needs_review","ready","archived"]),source:text,license:text,instructions:text,cefr:z.enum(["A1","A2","B1","B2","C1","C2"]).optional(),sections:z.array(section).min(1)});
export type Edition=z.infer<typeof editionSchema>;
export function validateEdition(item:Edition){
 const fail=(reason:string)=>{throw new Error(item.slug+": "+reason)};
 const keys=new Set<string>(),parts=new Set<string>();
 for(const s of item.sections){
   if(parts.has(s.id))fail("duplicate section "+s.id);parts.add(s.id);
   let end=0;
   for(const seg of s.segments){if(seg.end<=seg.start||seg.start<end-.015||!s.body.includes(seg.text)) fail("invalid transcript "+s.id);end=seg.end}
   if(item.status==="ready"&&item.skill==="listening"&&(!s.audio||!s.segments.length))fail("missing timed audio");
   if(item.status==="ready"&&item.kind==="task-1"&&!s.image)fail("missing task 1 visual");
   if(item.status==="ready"&&["reading","grammar","listening"].includes(item.skill)&&!s.questions.length)fail("empty exercises");
   for(const q of s.questions){
     if((q.kind==="multiple_choice" || q.kind==="true_false_not_given" || q.kind==="yes_no_not_given") && q.options.length<2)fail("missing choices "+q.id);
     if(keys.has(q.id))fail("duplicate question "+q.id);keys.add(q.id);
     if(new Set(q.options.map(x=>x.toLowerCase())).size!==q.options.length)fail("duplicate options "+q.id);
     if(q.options.length&&q.accepted.some(a=>!q.options.includes(a)))fail("invalid option key "+q.id);
     if(q.maxWords&&q.accepted.some(a=>a.split(/\s+/).length>q.maxWords!))fail("answer exceeds limit "+q.id);
     if(!s.body.includes(q.evidence))fail("unverified evidence "+q.id);
     if(item.skill==="listening"&&item.status==="ready"&&!s.segments.some(t=>q.at!==undefined&&q.at>=t.start-.001&&q.at<t.end&&t.text.includes(q.evidence)))fail("missing timestamp/evidence "+q.id);
   }
 }
 if(item.status==="ready"&&item.kind==="full-test"){
  const expected=item.skill==="reading"?3:item.skill==="listening"?4:0;
  if(!expected||item.sections.length!==expected||keys.size!==40)fail("incomplete full test");
  if(item.skill==="listening"&&item.sections.some(s=>s.questions.length!==10))fail("each part requires ten questions");
 }
}
