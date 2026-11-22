import Link from "next/link";
import {assessmentHistory, assessmentLevel, day, nextDate} from "@/server/content/assessment";

export async function AssessmentCard({userId}:{userId:number}) {
  const [last] = await assessmentHistory(userId);
  const due = last && nextDate(last);
  const open = !last || day() >= due;
  return <section className="panel dashboard-section">
    <h2>{last ? "Ваша неделя подготовки" : "С чего начать подготовку"}</h2>
    <p>Уровень заданий {assessmentLevel(last ? last.round+1 : 0)}</p>
    <p>{last ? `Уровень нагрузки: ${last.level}. В фокусе — ${last.focus}. Следующий мини-тест: ${due.split("-").reverse().join(".")}.` : "Пройдите входную диагностику, чтобы получить план на неделю."}</p>
    <Link className="text-link" href="/placement">Моя входная диагностика</Link>{" "}
    <Link className="studio-button btn-blue" href="/assessment">{open ? (last ? "Пройти мини-тест" : "Определить уровень") : "Посмотреть результаты"}</Link>
  </section>;
}
