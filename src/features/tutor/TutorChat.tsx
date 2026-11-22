"use client";
import { useState } from "react";
import Link from "next/link";
import { Send, LoaderCircle, ChevronUp, KeyRound } from "lucide-react";
import type { HistoryPage, TutorMode, Turn } from "./contracts";

const starters: Record<TutorMode, string[]> = {
  coach: [
    "Что мне повторить по моим результатам?",
    "Объясни, как отличать FALSE от NOT GIVEN.",
  ],
  conversation: [
    "Let's talk about a recent journey.",
    "Ask me about my hometown.",
  ],
  examiner: [
    "Start an IELTS Speaking Part 1 interview.",
    "Give me a Part 2 cue card.",
  ],
  lesson: [
    "Подбери домашнее задание по моим ошибкам.",
    "Объясни сравнительные конструкции и дай упражнение.",
  ],
};
export function TutorChat({
  mode,
  history,
  connected,
}: {
  mode: TutorMode;
  history: HistoryPage;
  connected: boolean;
}) {
  const [turns, setTurns] = useState<Turn[]>(history.turns);
  const [older, setOlder] = useState(history.hasOlder);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  async function previous() {
    if (!turns.length) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        "/api/tutor?mode=" + mode + "&before=" + turns[0].id,
        { cache: "no-store" },
      );
      if (!res.ok) throw Error("Не удалось загрузить историю.");
      const page = (await res.json()) as HistoryPage;
      setTurns((t) => [...page.turns, ...t]);
      setOlder(page.hasOlder);
    } catch {
      setError("Не удалось загрузить историю. Повторите попытку.");
    } finally {
      setLoading(false);
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy || !connected) return;
    setBusy(true);
    setError("");
    const id = requestId || crypto.randomUUID();
    setRequestId(id);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: text.trim(), requestId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "Не удалось получить ответ.");
      setTurns((t) =>
        t.some((i) => i.id === data.turn.id) ? t : [...t, data.turn],
      );
      setText("");
      setRequestId("");
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Нет связи с сервером. Сообщение осталось в редакторе."
          : e instanceof Error
            ? e.message
            : "Ошибка запроса.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel tutor-chat" aria-label="Диалог с преподавателем">
      {older && (
        <button
          className="studio-button btn-outline"
          disabled={loading}
          onClick={previous}
        >
          <ChevronUp size={15} />
          Ранние сообщения
        </button>
      )}
      <div className="tutor-transcript" aria-live="polite">
        {!turns.length && (
          <p className="tutor-hint">Здесь появятся сообщения этого диалога.</p>
        )}
        {turns.map((t) => (
          <article key={t.id}>
            <div className="tutor-message mine">
              <strong>Вы</strong>
              <p>{t.question}</p>
            </div>
            <div className="tutor-message">
              <strong>AI Tutor</strong>
              <p>{t.reply}</p>
            </div>
          </article>
        ))}
        {busy && (
          <p role="status" className="tutor-hint">
            AI Tutor готовит ответ…
          </p>
        )}
      </div>
      {connected ? (
        <form onSubmit={send}>
          <label htmlFor="tutor-message">Сообщение преподавателю</label>
          <textarea
            id="tutor-message"
            value={text}
            rows={4}
            maxLength={4000}
            disabled={busy}
            onChange={(e) => {
              setText(e.target.value);
              setRequestId("");
            }}
          />
          {!turns.length && (
            <div className="tutor-starters">
              {starters[mode].map((s) => (
                <button
                  key={s}
                  type="button"
                  className="studio-button btn-outline"
                  onClick={() => {
                    setText(s);
                    setRequestId("");
                  }}
                  disabled={busy}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <button
            className="studio-button btn-blue"
            disabled={!text.trim() || busy}
          >
            {busy ? <LoaderCircle size={16} /> : <Send size={16} />}Отправить
          </button>
        </form>
      ) : (
        <div className="tutor-connect">
          <p>Подключите свой ключ OpenAI, чтобы отправить сообщение.</p>
          <Link
            className="studio-button btn-blue"
            href="/settings#ai-connection"
          >
            <KeyRound size={16} />
            Подключить OpenAI
          </Link>
        </div>
      )}
      {error && (
        <p className="tutor-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
