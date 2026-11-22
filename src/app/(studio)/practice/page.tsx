import {requireAuth} from "@/server/auth/current";
import { Skills } from "@/features/dashboard/Skills";
import { MaterialList } from "@/features/practice/MaterialList";
import { getDashboard, getCatalogSummary } from "@/server/db";
import Link from "next/link";
export const metadata = { title: "Практика" };
const levels=["A1","A2","B1","B2","C1","C2"];
export default async function Practice({searchParams}:{searchParams:Promise<{level?:string}>}) {
  const requested=(await searchParams).level;
  const level=levels.find(item=>item===requested)??"A1";
  const account = await requireAuth();
  const [data, materials] = await Promise.all([getDashboard(account.userId), getCatalogSummary()]);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Практика</h1>
          <p>Материалы IELTS Academic для самостоятельной работы</p>
        </div>
      </div>
      <Skills bands={data.skillBands} />
      <section className="dashboard-section panel">
        <h2>Практика по уровню</h2>
        <nav className="bank-filters" aria-label="Выберите уровень">{levels.map(item=>
          <Link key={item} className={"studio-button "+(level===item?"btn-blue":"btn-outline")} aria-current={item===level?"page":undefined} href={"/practice?level="+item+"#level-practice"}>{item}</Link>)}</nav>
        <div id="level-practice">{(["listening","reading","writing","speaking"] as const).map(skill=>{
          const items=materials.filter(m=>m.cefr===level&&m.skill===skill&&m.slug.startsWith("level-"));
          return items.length>0&&<section key={skill}><h3>{skill[0].toUpperCase()+skill.slice(1)}</h3><MaterialList items={items}/></section>;
        })}</div>
      </section>
      <section className="dashboard-section panel">
        <h2>Доступные материалы</h2>
        <MaterialList items={materials.filter((m) => m.skill !== "grammar").slice(0,12)} />
      </section>
    </>
  );
}
