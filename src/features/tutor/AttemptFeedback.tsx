"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Sparkles } from "lucide-react";
import type { Review } from "./contracts";
import "./tutor.css";

export function AttemptFeedback({ attemptId }: { attemptId: number }) {
  const [review, setReview] = useState<Review>({
      feedback: null,
      transcript: null,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/feedback/" + attemptId, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const result = await r.json();
        if (!r.ok) throw Error(result.error);
        setReview(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Не удалось загрузить разбор.",
          );
      });
    return () => controller.abort();
  }, [attemptId]);
  async function evaluate() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/feedback/" + attemptId, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось проверить ответ.");
        const cached = await fetch("/api/feedback/" + attemptId, {
          cache: "no-store",
        });
        if (cached.ok) setReview(await cached.json());
      } else setReview(data);
    } catch {
      setError("Нет связи с сервером. Повторите запрос.");
    } finally {
      setBusy(false);
    }
  }
  const f = review.feedback;
  return (
    <section className="panel ai-attempt-feedback">
      <h2>
        <Sparkles size={19} />
        Разбор AI Tutor
      </h2>
      {review.transcript && (
        <details open>
          <summary>Расшифровка записи</summary>
          <p>{review.transcript}</p>
        </details>
      )}
      {!f ? (
        <>
          <p>
            Для проверки используется ваш ключ OpenAI. Текст ответа или запись
            будут отправлены провайдеру.
          </p>
          <button
            className="studio-button btn-blue"
            disabled={busy}
            onClick={evaluate}
          >
            <ClipboardCheck size={15} />
            {busy ? "Идёт проверка…" : "Проверить с AI"}
          </button>
          <Link href="/settings#ai-connection" className="text-link">
            Настройки подключения
          </Link>
        </>
      ) : (
        <>
          {f.estimatedBand !== null && (
            <p>
              <b>Оценка за задание · Band {f.estimatedBand.toFixed(1)}</b>
            </p>
          )}
          <p>
            Учебная оценка AI Tutor. Официальный балл выставляет экзаменатор
            IELTS.
          </p>
          {f.criteria.map((c) => (
            <div key={c.name} className="review-criterion">
              <strong>
                {c.name}
                {c.band !== null ? " · " + c.band.toFixed(1) : ""}
              </strong>
              <p>{c.comment}</p>
            </div>
          ))}
          {(
            [
              ["Что удалось", f.strengths],
              ["Что улучшить", f.recommendations],
              ["Лексика", f.vocabulary],
              ["Грамматические темы", f.grammarTopics],
            ] as const
          ).map(
            ([label, items]) =>
              items.length > 0 && (
                <div key={label}>
                  <h3>{label}</h3>
                  <ul>
                    {items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ),
          )}
          {f.corrections.length > 0 && (
            <div>
              <h3>Разбор предложений</h3>
              {f.corrections.map((c, i) => (
                <div key={i} className="review-criterion">
                  <p lang="en">
                    <del>{c.original}</del>
                  </p>
                  <p lang="en">
                    <b>{c.improved}</b>
                  </p>
                  <p>{c.explanation}</p>
                </div>
              ))}
            </div>
          )}
          <Link className="text-link" href="/ai-tutor?mode=lesson">
            Получить задание по этим темам
          </Link>
        </>
      )}
      {error && (
        <p role="alert" className="tutor-error">
          {error}
        </p>
      )}
    </section>
  );
}
