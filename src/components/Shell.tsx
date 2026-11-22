"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  HardDrive,
  Home,
  LayoutGrid,
  Menu,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { flatNav, navGroups, settingsNav, skills } from "@/lib/navigation";
import type { ConnectionStatus } from "@/features/settings/SessionPanel";

function Logo() {
  return (
    <Link className="brand" href="/" aria-label="IELTS Studio — обзор">
      <span className="brand-mark">
        <BookOpen size={23} strokeWidth={2.2} />
      </span>
      <span className="brand-name">
        IELTS <b>Studio</b>
      </span>
    </Link>
  );
}
export function Shell({
  children,
  status,
  name,
}: {
  children: React.ReactNode;
  status: ConnectionStatus;
  name: string;
}) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [expanded, setExpanded] = useState(path.startsWith("/practice/"));
  const current = flatNav.find((i) =>
    i.href === "/"
      ? path === "/"
      : path === i.href || path.startsWith(i.href + "/"),
  );
  const skill = skills.find((s) => path === "/practice/" + s.key);
  const connected = status === "connected";
  const close = () => setMobile(false);
  function nav() {
    return (
      <>
        {navGroups.map((group) => (
          <div className="nav-group" key={group.title}>
            <div className="nav-group-label">{group.title}</div>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/"
                  ? path === "/"
                  : path === href || path.startsWith(href + "/");
              return (
                <div key={href}>
                  <div className={"nav-row" + (active ? " active" : "")}>
                    <Link
                      href={href}
                      title={label}
                      aria-current={active ? "page" : undefined}
                      onClick={close}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </Link>
                    {href === "/practice" && (
                      <button
                        aria-label="Навыки практики"
                        aria-expanded={expanded}
                        onClick={() => setExpanded(!expanded)}
                      >
                        <ChevronDown
                          size={14}
                          className={expanded ? "turn" : ""}
                        />
                      </button>
                    )}
                  </div>
                  {href === "/practice" && expanded && (
                    <div className="subnav">
                      {skills.map((s) => (
                        <Link
                          key={s.key}
                          href={"/practice/" + s.key}
                          onClick={close}
                        >
                          {s.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </>
    );
  }
  const settingsLink = (
    <Link
      className={
        "settings-link" + (path.startsWith("/settings") ? " active" : "")
      }
      href="/settings"
      title="Настройки"
      onClick={close}
    >
      <settingsNav.icon size={18} />
      <span>Настройки</span>
    </Link>
  );
  return (
    <div className={"workspace" + (collapsed ? " collapsed" : "")}>
      <a className="skip" href="#workspace-main">
        К содержимому
      </a>
      <aside className="sidebar">
        <div className="brand-row">
          <Logo />
        </div>
        <nav className="side-links" aria-label="Основная навигация">
          {nav()}
        </nav>
        <div className="side-foot">
          <Link
            className="ai-connection"
            href={status === "new" ? "/onboarding" : "/settings#ai-connection"}
            title="Подключение OpenAI"
          >
            <Sparkles size={18} />
            <span>
              <b>AI Tutor</b>
              <small>
                {connected ? "OpenAI подключён" : "AI не подключён"}
              </small>
            </span>
            <ChevronRight size={14} />
          </Link>
          <div className="side-bottom">
            {settingsLink}
            <button
              className="collapse-control"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
            >
              {collapsed ? (
                <ChevronsRight size={17} />
              ) : (
                <ChevronsLeft size={17} />
              )}
              <span>Свернуть меню</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="work-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="desktop-home">
              <LayoutGrid size={16} />
              Рабочее пространство
            </span>
            <ChevronRight className="desktop-home" size={14} />
            <b>
              {skill?.title ??
                (path.startsWith("/settings/library")
                  ? "Библиотека материалов"
                  : current?.label)}
            </b>
          </div>
          <div className="top-actions">
            <span className="local-state">
              <span className="status-dot" />
              Локально
            </span>
            <span className="top-divider" />
            <Link
              className="profile-icon"
              href="/settings"
              aria-label="Настройки профиля"
            >
              {name.trim() ? (
                name.trim()[0].toUpperCase()
              ) : (
                <UserRound size={17} />
              )}
            </Link>
          </div>
        </header>
        <main id="workspace-main" className="content">
          {children}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Быстрая навигация">
        {[
          { href: "/", label: "Обзор", icon: Home },
          { href: "/practice", label: "Практика", icon: BookOpen },
          { href: "/ai-tutor", label: "AI Tutor", icon: Sparkles },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            className={
              path === href || path.startsWith(href + "/") ? "active" : ""
            }
            href={href}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
        <button aria-expanded={mobile} onClick={() => setMobile(true)}>
          <Menu size={20} />
          Меню
        </button>
      </nav>
      <Dialog.Root open={mobile} onOpenChange={setMobile}>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-overlay" />
          <Dialog.Content className="drawer" aria-describedby={undefined}>
            <div className="drawer-title">
              <Dialog.Title>IELTS Studio</Dialog.Title>
              <Dialog.Close aria-label="Закрыть меню">
                <X size={20} />
              </Dialog.Close>
            </div>
            <nav aria-label="Все разделы">
              {nav()}
              {settingsLink}
            </nav>
            <div className="drawer-storage">
              <HardDrive size={15} />
              {connected ? "OpenAI подключён" : "Локальное хранилище"}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
