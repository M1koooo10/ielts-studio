import {SessionPanel} from "@/features/settings/SessionPanel";
import "@/features/settings/settings.css";
import {requireAuth} from "@/server/auth/current";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Flame,
  History,
  Pencil,
  Sparkles,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { getSettings, getDashboard, getCatalogSummary } from "@/server/db";
import { getSessionStatus } from "@/server/ai/status";
import { Skills } from "@/features/dashboard/Skills";
import { AssessmentCard } from "@/features/dashboard/AssessmentCard";
import { Hero } from "@/features/dashboard/Hero";
import { ActivityChart } from "@/features/dashboard/Activity";

export default async function DashboardPage() {
  const account = await requireAuth();
  const [settings, week, month, status, materials] = await Promise.all([
    getSettings(account.userId),
    getDashboard(account.userId),
    getDashboard(account.userId,30),
    getSessionStatus(),
    getCatalogSummary(),
  ]);
  const today = new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {settings.displayName
              ? `Обзор, ${settings.displayName}`
              : "Обзор подготовки"}
          </h1>
          <p>Ваше персональное учебное пространство</p>
        </div>
        <span className="date-label">
          <CalendarDays size={16} />
          {today}
        </span>
      </div>
      <AssessmentCard userId={account.userId}/>
      <Hero status={status} />
      <section className="dashboard-section">
        <div className="section-head">
          <h2>Практика по навыкам</h2>
          <Link className="text-link" href="/practice">
            Вся практика <ChevronRight size={15} />
          </Link>
        </div>
        <Skills bands={week.skillBands} />
      </section>
      <div className="dashboard-middle">
        <ActivityChart week={week} month={month} />
        <section className="panel goal-card">
          <div className="panel-title">
            <h2>
              <Target size={21} />
              Моя цель
            </h2>
            <Link
              className="icon-link"
              href="/settings"
              aria-label="Изменить цель"
            >
              <Pencil size={15} />
            </Link>
          </div>
          <div className="goal-score">
            <div>
              <span>Целевой балл</span>
              <strong>
                {settings.targetBand?.toFixed(1) ?? "—"} <small>Band</small>
              </strong>
            </div>
            <div className="target-art" aria-hidden="true">
              <Target />
            </div>
          </div>
          <div className="goal-row">
            <CalendarDays size={16} />
            <span>Дата экзамена</span>
            <b>
              {settings.examDate
                ? new Date(settings.examDate + "T12:00:00").toLocaleDateString(
                    "ru-RU",
                  )
                : "Не задана"}
            </b>
          </div>
          <div className="goal-row">
            <Timer size={16} />
            <span>Занятия в день</span>
            <b>{settings.dailyMinutes} мин</b>
          </div>
        </section>
      </div>
      <div className="two-panels">
        <section className="panel">
          <div className="panel-title">
            <h2>
              <ClipboardList size={20} />
              План на сегодня
            </h2>
            <Link className="text-link" href="/study-plan">
              Открыть
            </Link>
          </div>
          {week.dueTasks.length ? (
            week.dueTasks.map((t) => (
              <p key={t.id}>
                {t.done ? "✓ " : ""}
                {t.title}
              </p>
            ))
          ) : (
            <p className="empty-copy">
              На сегодня пока нет запланированных занятий.
            </p>
          )}
          {materials[0] && (
            <Link
              className="material-link"
              href={"/settings/library/" + materials[0].slug}
            >
              <span>Материал для знакомства</span>
              <b>{materials[0].title}</b>
              <ChevronRight size={17} />
            </Link>
          )}
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>
              <History size={20} />
              Последняя активность
            </h2>
          </div>
          {week.recent.length ? (
            week.recent.map((x) => (
              <p key={x.id}>
                {x.title} · {x.minutes} мин
              </p>
            ))
          ) : (
            <p className="empty-copy">Здесь появится история ваших занятий.</p>
          )}
          <div className="goal-row">
            <Flame size={16} />
            Серия занятий<b>{week.streak} дн.</b>
          </div>
          <div className="goal-row">
            <Trophy size={16} />
            Последний пробный тест
            <b>{week.latestMockBand ?? "Нет результата"}</b>
          </div>
        </section>
      </div>
      <section className="panel tutor-strip">
        <Sparkles size={21} />
        <div>
          <h2>Рекомендации AI Tutor</h2>
          <p>
            {status === "connected"
              ? "Попросите преподавателя подобрать следующее задание."
              : "Подключение OpenAI доступно в настройках сессии."}
          </p>
        </div>
        <SessionPanel initialStatus={status}/><Link className="text-link" href="/settings#ai-connection">Настройки AI</Link><Link className="text-link" href="/ai-tutor">
          AI Tutor <ChevronRight size={15} />
        </Link>
      </section>
    </>
  );
}
