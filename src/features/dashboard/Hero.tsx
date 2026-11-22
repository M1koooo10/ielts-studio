"use client";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ConnectionStatus } from "@/features/settings/SessionPanel";

export function Hero({ status }: { status: ConnectionStatus }) {
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function offline() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "offline" }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="hero">
      <div className="hero-art" />
      <div className="hero-inner">
        <span className="exam-label">
          <GraduationCap size={15} />
          IELTS Academic
        </span>
        <h2>Ваш путь к IELTS</h2>
        <p>Начните с текста, темы для эссе или устного задания.</p>
        <div className="hero-actions">
          <Button asChild variant="hero">
            <Link href={status === "new" ? "/onboarding" : "/practice"}>
              {status === "new" ? "Начать подготовку" : "Перейти к практике"}
              <ArrowRight size={16} />
            </Link>
          </Button>
          {status === "new" && (
            <button className="offline-btn" disabled={busy} onClick={offline}>
              {busy ? "Входим…" : "Войти без AI"}
            </button>
          )}
        </div>
        {error && (
          <small role="alert">
            Не удалось начать сессию. Попробуйте ещё раз.
          </small>
        )}
      </div>
    </section>
  );
}
