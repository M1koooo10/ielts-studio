"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="content panel">
      <h1>Не удалось загрузить страницу</h1>
      <p>Проверьте доступ к локальному серверу и попробуйте ещё раз.</p>
      <button className="studio-button btn-blue" onClick={reset}>
        Повторить
      </button>
    </section>
  );
}
