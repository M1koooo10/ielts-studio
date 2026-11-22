import {requireAuth} from "@/server/auth/current";
import { getDashboard } from "@/server/db";
import { ActivityChart } from "@/features/dashboard/Activity";
import { SectionHeading } from "@/components/SectionHeading";
export const metadata = { title: "Аналитика" };
export default async function Page() {
  const account = await requireAuth();
  const [week, month] = await Promise.all([getDashboard(account.userId), getDashboard(account.userId,30)]);
  return (
    <>
      <SectionHeading title={metadata.title} />
      <>
        <ActivityChart week={week} month={month} />
        <section className="panel dashboard-section">
          <h2>Последние баллы по навыкам</h2>
          {Object.entries(week.skillBands).map(([key, band]) => (
            <div key={key} className="goal-row">
              <span className="capitalize">{key}</span>
              <b>{band === null ? "Нет оценки" : band.toFixed(1)}</b>
            </div>
          ))}
        </section>
      </>
    </>
  );
}
