"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import {
  Check,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Plug,
  Unplug,
} from "lucide-react";

export type ConnectionStatus = "new" | "offline" | "connected";
export const statusLabels = {
  new: "Сессия не начата",
  offline: "Локальный режим",
  connected: "OpenAI подключён",
};

type Action = "connect" | "offline" | "disconnect" | "test";

export function SessionPanel({
  initialStatus,
  onboarding = false,
  keyRequired = false,
  destination = "/",
}: {
  initialStatus: ConnectionStatus;
  onboarding?: boolean;
  keyRequired?: boolean;
  destination?: string;
}) {
  const router = useRouter();
  const keyInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState(initialStatus);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const expanded = onboarding || editing;

  async function run(action: Action, key?: string) {
    setPending(action);
    setError("");
    setMessage("");
    try {
      const result = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "connect"
            ? { action, provider: "openai", key }
            : { action },
        ),
      });
      const data = await result.json();
      if (!result.ok) {
        if (data.status === "offline") {
          setStatus("offline");
          router.refresh();
        }
        throw new Error(
          typeof data.error === "string" ? data.error : "Операция не удалась.",
        );
      }
      setStatus(data.status);
      setEditing(false);
      setMessage(
        data.message ??
          (action === "connect"
            ? "Подключение готово."
            : action === "disconnect"
              ? "Ключ удалён из сессии."
              : "Локальный режим включён."),
      );
      if (onboarding && action !== "test") router.replace(destination);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof TypeError
          ? "Нет связи с локальным сервером. Повторите попытку."
          : cause instanceof Error
            ? cause.message
            : "Не удалось выполнить запрос.",
      );
    } finally {
      setPending(null);
    }
  }

  function connect(event: FormEvent) {
    event.preventDefault();
    if (!keyInput.current) return;
    const key = keyInput.current.value.trim();
    keyInput.current.value = "";
    if (!key) {
      setError("Введите API-ключ OpenAI.");
      return;
    }
    void run("connect", key);
  }

  return (
    <div className="connection-panel">
      {!onboarding && (
        <span
          className="connection-state"
          data-connected={status === "connected"}
        >
          {status === "connected" ? <Check size={16} /> : <Unplug size={16} />}{" "}
          {statusLabels[status]}
        </span>
      )}
      {expanded ? (
        <form
          onSubmit={connect}
          method="post"
          autoComplete="off"
          className="connection-fields"
        >
          <label className="setting-field">
            Провайдер
            <select name="provider" defaultValue="openai" disabled={!!pending}>
              <option value="openai">OpenAI</option>
            </select>
          </label>
          <label className="setting-field">
            API-ключ
            <div className="key-box">
              <KeyRound size={17} aria-hidden="true" />
              <input
                aria-describedby="key-hint"
                ref={keyInput}
                type="password"
                required
                maxLength={2048}
                autoComplete="off"
                spellCheck={false}
                disabled={!!pending}
                placeholder="sk-…"
              />
            </div>
          </label>
          <p className="key-hint" id="key-hint">
            <LockKeyhole size={15} aria-hidden="true" /> Ключ хранится в памяти
            локального сервера до отключения или истечения сессии.
          </p>
          <div className="setting-actions">
            <button className="sf-button sf-primary" disabled={!!pending}>
              {pending === "connect" ? (
                <LoaderCircle className="sf-spin" size={17} />
              ) : (
                <Plug size={17} />
              )}
              {pending === "connect"
                ? "Проверяем ключ…"
                : onboarding
                  ? "Подключить и продолжить"
                  : "Подключить ключ"}
            </button>
            {onboarding ? (!keyRequired&&
              <button
                type="button"
                className="sf-button"
                disabled={!!pending}
                onClick={() => void run("offline")}
              >
                Продолжить без AI
              </button>
            ) : (
              <button
                type="button"
                className="sf-button"
                disabled={!!pending}
                onClick={() => {
                  setEditing(false);
                  setError("");
                }}
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="setting-actions">
          <button
            className="sf-button"
            disabled={!!pending}
            onClick={() => {
              setEditing(true);
              setError("");
              setMessage("");
            }}
          >
            <KeyRound size={16} />
            {status === "connected" ? "Сменить ключ" : "Подключить OpenAI"}
          </button>
          {status === "connected" && (
            <>
              <button
                className="sf-button"
                disabled={!!pending}
                onClick={() => void run("test")}
              >
                {pending === "test" ? "Проверяем…" : "Проверить связь"}
              </button>
              <button
                className="sf-button"
                disabled={!!pending}
                onClick={() => void run("disconnect")}
              >
                Отключить
              </button>
            </>
          )}
          {status === "new" && (
            <button
              className="sf-button"
              disabled={!!pending}
              onClick={() => void run("offline")}
            >
              Продолжить без AI
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="sf-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="sf-success" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
