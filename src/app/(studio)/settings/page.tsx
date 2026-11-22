import {LogoutButton} from "@/features/auth/AccountForms";
import {requireAuth} from "@/server/auth/current";
import Link from "next/link";
import { LibraryBig, Plug } from "lucide-react";
import { getSettings } from "@/server/db";
import { getSessionStatus } from "@/server/ai/status";
import { SessionPanel } from "@/features/settings/SessionPanel";
import { SettingsForm } from "@/features/settings/SettingsForm";
import "@/features/settings/settings.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const account = await requireAuth();
  const [settings, status] = await Promise.all([
    getSettings(account.userId),
    getSessionStatus(),
  ]);
  return (
    <div className="sf-page">
      <header className="sf-page-heading">
        <h1>Настройки</h1>
        <p>Цель подготовки, оформление и подключение преподавателя.</p>
      </header>
      <div className="preferences-layout">
        <SettingsForm initial={settings} canSave={status !== "new"} />
        <aside className="settings-aside"><section className="sf-card"><h2>Аккаунт</h2><p className="sf-card-description">Номер телефона: {account.phoneMasked}</p><LogoutButton/></section>
          <section id="ai-connection" className="sf-card">
            <div className="sf-heading">
              <Plug size={20} />
              <h2>Подключение AI</h2>
            </div>
            <SessionPanel initialStatus={status} />
            <p className="sf-note">
              Расходы на запросы можно посмотреть в аккаунте OpenAI. 
              Ключ действует в текущей сессии.
            </p>
          </section>
          <section className="sf-card">
            <div className="sf-heading">
              <LibraryBig size={20} />
              <h2>Библиотека</h2>
            </div>
            <p className="sf-card-description">
              Исходные материалы для самостоятельной подготовки.
            </p>
            <Link className="sf-button" href="/settings/library">
              Открыть библиотеку
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
