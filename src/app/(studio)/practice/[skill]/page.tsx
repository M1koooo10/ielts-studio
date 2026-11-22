import {notFound} from "next/navigation";
import {skills} from "@/lib/navigation";import {BankPage} from "@/features/practice/BankPage";
export const dynamicParams=false;
export function generateStaticParams(){return skills.map(s=>({skill:s.key}));}
export default async function SkillPage({params}:{params:Promise<{skill:string}>}){const {skill}=await params;const entry=skills.find(s=>s.key===skill);if(!entry)notFound();return <BankPage skill={skill} title={entry.title}/>;}
