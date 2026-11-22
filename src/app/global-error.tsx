"use client";
export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body>
        <main>
          <h1>Рабочее пространство недоступно</h1>
          <p>
            Проверьте, что локальная база SQLite доступна для чтения и записи.
          </p>
          <button onClick={reset}>Повторить</button>
        </main>
      </body>
    </html>
  );
}
