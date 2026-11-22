"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Check,
  Monitor,
  Moon,
  Palette,
  Save,
  SlidersHorizontal,
  Sun,
  Target,
} from "lucide-react";
import type { Settings } from "@/lib/contracts";

const themes = [
  { value: "light", label: "Светлая", icon: Sun },
  { value: "dark", label: "Тёмная", icon: Moon },
  { value: "system", label: "Системная", icon: Monitor },
] as const;

export function SettingsForm({
  initial,
  canSave,
}: {
  initial: Settings;
  canSave: boolean;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, dirtyFields, isSubmitting },
  } = useForm<Settings>({ defaultValues: initial });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(values: Settings) {
    setError("");
    setMessage("");
    try {
      const patch = Object.fromEntries(
        Object.keys(dirtyFields).map((key) => [
          key,
          values[key as keyof Settings],
        ]),
      );
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        if (response.status === 401)
          throw new Error(
            "Сессия завершена. Выберите подключение или локальный режим.",
          );
        throw new Error(
          (await response.json()).error || "Не удалось сохранить настройки.",
        );
      }
      const { settings } = await response.json();
      reset(settings);
      setMessage("Настройки сохранены.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof TypeError
          ? "Сервер недоступен. Попробуйте сохранить ещё раз."
          : cause instanceof Error
            ? cause.message
            : "Не удалось сохранить настройки.",
      );
    }
  }
  return (
    <form
      onSubmit={handleSubmit(save)}
      className="preferences-form"
      onChange={() => {
        setMessage("");
        setError("");
      }}
    >
      <section className="sf-card">
        <div className="sf-heading">
          <Target size={20} />
          <h2>Профиль и цель</h2>
        </div>
        <div className="settings-fields-grid">
          <label className="setting-field">
            Имя
            <input
                required {...register("displayName")}
              maxLength={60}
              autoComplete="given-name"
              placeholder="Ваше имя"
            />
          </label>
          <label className="setting-field">
            Целевой балл
            <select
              {...register("targetBand", {
                setValueAs: (value) =>
                  value === "" || value == null ? null : Number(value),
              })}
            >
              <option value="">Пока не выбрано</option>
              {Array.from({ length: 17 }, (_, i) => 1 + i * 0.5).map((band) => (
                <option key={band} value={band}>
                  {band.toFixed(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="setting-field">
            Дата экзамена
            <input
              type="date"
              {...register("examDate", { setValueAs: (v) => v || null })}
            />
          </label>
          <label className="setting-field">
            Минут в день
            <input
              required
              type="number"
              min={5}
              max={600}
              {...register("dailyMinutes", { valueAsNumber: true })}
            />
          </label>
        </div>
      </section>
      <section className="sf-card">
        <div className="sf-heading">
          <Palette size={20} />
          <h2 id="appearance-title">Оформление</h2>
        </div>
        <div
          className="appearance-grid"
          role="radiogroup"
          aria-labelledby="appearance-title"
        >
          {themes.map(({ label, value, icon: Icon }) => (
            <label key={value} className="theme-choice">
              <input type="radio" value={value} {...register("theme")} />
              <span className="choice-inner">
                <Icon size={20} />
                <span>{label}</span>
                <Check size={15} className="choice-check" />
              </span>
            </label>
          ))}
        </div>
      </section>
      <section className="sf-card">
        <div className="sf-heading">
          <SlidersHorizontal size={20} />
          <h2>Предпочтения AI Tutor</h2>
        </div>
        <div className="settings-fields-grid">
          <label className="setting-field">
            Язык объяснений
            <select {...register("aiLanguage")}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="setting-field">
            Модель OpenAI
            <input
              {...register("aiModel")}
              required
              maxLength={100}
              list="model-options"
              spellCheck={false}
            />
            <datalist id="model-options">
              {Array.from(
                new Set([
                  initial.aiModel,
                  "gpt-4.1-mini",
                  "gpt-4.1",
                  "gpt-4o-mini",
                ]),
              ).map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </label>
        </div>
        <label className="sf-checkbox">
          <input type="checkbox" {...register("voiceEnabled")} /> Озвучивать
          ответы в голосовых уроках
        </label>
        <p className="sf-note">
          Настройки применяются к запросам AI Tutor. Доступ
          к выбранной модели зависит от вашего аккаунта OpenAI.
        </p>
      </section>
      <div className="sf-savebar">
        <button
          type="submit"
          className="sf-button sf-primary"
          disabled={isSubmitting || !isDirty || !canSave}
        >
          <Save size={16} />
          {isSubmitting ? "Сохраняем…" : "Сохранить настройки"}
        </button>
        {!canSave && (
          <Link href="/onboarding?next=settings">
            Начать сессию для сохранения
          </Link>
        )}
        {message && (
          <span className="sf-success" role="status">
            {message}
          </span>
        )}
        {error && (
          <span className="sf-error" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
