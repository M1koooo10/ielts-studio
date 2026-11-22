import Link from "next/link";
import {listeningAudio} from "@/server/content/listening-audio";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireAuth} from "@/server/auth/current";
import {assessment, assessmentLevel, assessmentHistory, day, nextDate, submitAssessment} from "@/server/content/assessment";

export const metadata = {title:"Диагностика и мини-тесты"};
async function finish(round:number,form:FormData) {
  "use server";
  const user = await requireAuth();
  await submitAssessment(user.userId,round,form);
  for(const path of ["/","/assessment","/study-plan","/mock-tests"]) revalidatePath(path);
  redirect("/assessment");
}
export default async function AssessmentPage() {
  const user = await requireAuth();
  const history = await assessmentHistory(user.userId);
  const last = history[0];
  if(!last)redirect("/placement");
  const round = last ? last.round+1 : 0;
  const due = last && nextDate(last);
  const available = !last || day() >= due;
  const sections=available?await Promise.all(assessment(round).map(async section=>section.audio?{...section,audio:(await listeningAudio(section.audio)).audio}:section)):[];
  return <>
    <div className="page-heading"><div><h1>{round ? "Еженедельный мини-тест IELTS" : "Входной тест"}</h1>
      <p>Уровень заданий {assessmentLevel(round)} · {round ? "Чтение и аудирование · 10 вопросов" : "Грамматика и чтение · 8 вопросов"}</p></div></div>
    {last && <section className="panel">
      <h2>{last.round===0?"Входная диагностика · Listening и Reading":"Ваш результат"} · {last.score} из {last.total}</h2>
      {last.round===0&&<Link className="text-link" href="/placement">Открыть профиль четырёх навыков</Link>}
      <p>Уровень пройденного теста · {assessmentLevel(last.round)}</p>
      <p>Уровень нагрузки — {last.level.toLowerCase()}. В плане больше внимания получит {last.focus.toLowerCase()}.</p>
      <p>Следующий тест доступен с {due.split("-").reverse().join(".")}.</p>
      <Link className="studio-button btn-blue" href="/study-plan">Открыть мой план</Link>
    </section>}
    {available && <form action={finish.bind(null,round)}>
      {sections.map((section,s)=><section className="panel dashboard-section" key={section.title}>
        <h2>{section.title}</h2>
        {section.body?.split(/\n\s*\n/).map((line,i)=><p key={i}>{line}</p>)}
        {section.audio && <audio controls preload="metadata" src={section.audio} aria-label="Запись для аудирования"/>}
        {section.questions.map((q,i)=><fieldset key={i} style={{marginBlock:"1.25rem"}}>
          <legend>{i+1}. {q.prompt}</legend>
          {q.options?.length ? q.options.map(option=><label key={option} style={{display:"block",padding:".25rem"}}>
            <input type="radio" name={`answer-${s}-${i}`} value={option} required/> {option}
          </label>) : <input aria-label={q.prompt} name={`answer-${s}-${i}`} required maxLength={250} placeholder="Ваш ответ"/>}
        </fieldset>)}
      </section>)}
      <button className="studio-button btn-blue">Завершить тест и получить план</button>
    </form>}
    {history.length>1 && <section className="panel dashboard-section"><h2>История результатов</h2>
      {history.map(r=><p key={r.round}>{r.date.split("-").reverse().join(".")} · {r.round ? "Мини-тест "+r.round : "Входной тест"} · {assessmentLevel(r.round)} · {r.score} из {r.total}</p>)}
    </section>}
  </>;
}
