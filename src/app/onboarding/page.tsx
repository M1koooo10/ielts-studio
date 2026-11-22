import {requireAuth} from "@/server/auth/current";
import {redirect} from "next/navigation";
import {needsInitialKey} from "@/server/auth/initial-key";
import {LogoutButton} from "@/features/auth/AccountForms";
import Link from "next/link";
import { BookOpen, HardDrive, Layers3 } from "lucide-react";
import { getSessionStatus } from "@/server/ai/status";
import { SessionPanel } from "@/features/settings/SessionPanel";
import "@/features/settings/settings.css";

export const metadata = { title: "Начало сессии" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const account=await requireAuth();
  if(!account.displayName)redirect("/complete-profile");
  const [status, query,required] = await Promise.all([getSessionStatus(), searchParams,needsInitialKey(account.userId)]);
  return (
    <main className="setup-screen">
      <div className="setup-wrapper">
        <Link className="setup-brand" href="/">
          <span>
            <BookOpen size={23} />
          </span>{" "}
          IELTS Studio
        </Link>
        <div className="setup-main">
          <section className="setup-intro">
            <div className="setup-stamp">
              <Layers3 size={17} /> IELTS Academic
            </div>
            <h1>
              Ваша студия
              <br />
              английского.
            </h1>
            <p>
              {required?"Подключите свой API-ключ OpenAI. Затем вы пройдёте входной тест и получите учебный план по своему уровню.":"Подключите OpenAI для занятий с AI Tutor или начните подготовку в локальном режиме."}
            </p>
            <div className="setup-local">
              <HardDrive size={18} /> Учебные данные хранятся в вашем
              аккаунте
            </div>
          </section>
          <section className="sf-card setup-form">
            <h2>{required?"Подключите OpenAI перед тестом":"Начать сессию"}</h2>
            <p className="sf-card-description">
              {required?"После проверки ключа откроется диагностика английского.":"Выберите, как заниматься сегодня."}
            </p>
            <SessionPanel
              initialStatus={status}
              onboarding
              keyRequired={required}
              destination={required ? "/placement" : query.next === "settings" ? "/settings" : "/"}
            />
            {required&&<LogoutButton/>}
          </section>
        </div>
        <span className="setup-tagline" lang="en">
          Your Personal IELTS Learning Workspace.
        </span>
      </div>
    </main>
  );
}
