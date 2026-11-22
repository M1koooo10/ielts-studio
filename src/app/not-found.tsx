import Link from "next/link";
export default function NotFound() {
  return (
    <main className="content">
      <h1>Страница не найдена</h1>
      <Link className="text-link" href="/">
        Вернуться к обзору
      </Link>
    </main>
  );
}
