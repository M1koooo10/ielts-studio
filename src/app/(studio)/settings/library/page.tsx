import Link from "next/link";
import { Clock3, LibraryBig } from "lucide-react";
import { getCatalogSummary } from "@/server/db";
import { librarySkills } from "@/features/library/labels";
import "@/features/settings/settings.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Библиотека материалов" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const [materials, query] = await Promise.all([getCatalogSummary(), searchParams]);
  const active = Object.hasOwn(librarySkills, query.skill ?? "")
    ? query.skill
    : undefined;
  const filtered = materials.filter(
    (material) => !active || material.skill === active,
  );
  return (
    <div className="sf-page">
      <header className="sf-page-heading">
        <Link className="sf-back" href="/settings">
          Настройки
        </Link>
        <h1>Библиотека материалов</h1>
        <p>Оригинальные тексты, задания и темы IELTS Academic для просмотра.</p>
      </header>
      <nav className="library-filter" aria-label="Материалы по навыку">
        <Link
          href="/settings/library"
          aria-current={!active ? "page" : undefined}
        >
          Все материалы
        </Link>
        {Object.entries(librarySkills).map(([skill, item]) => (
          <Link
            key={skill}
            href={"/settings/library?skill=" + skill}
            aria-current={skill === active ? "page" : undefined}
          >
            {item.name}
          </Link>
        ))}
      </nav>
      {filtered.length ? (
        <div className="library-grid">
          {filtered.map((material) => {
            const { name, icon: Icon } = librarySkills[material.skill];
            return (
              <Link
                key={material.slug}
                className="sf-card library-item"
                href={"/settings/library/" + encodeURIComponent(material.slug)}
              >
                <span className="library-skill">
                  <Icon size={18} />
                  {name}
                </span>
                <h2 lang="en">{material.title}</h2>
                <p>{material.description}</p>
                <span className="library-meta">
                  <Clock3 size={15} />
                  {material.cefr} · {material.minutes} мин
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <section className="sf-card library-empty">
          <LibraryBig size={28} />
          <h2>Материалов пока нет</h2>
          <p>Выберите другой навык, чтобы посмотреть доступные задания.</p>
        </section>
      )}
      <p className="sf-note">
        Импорт собственных материалов доступен командой npm run content:import.
      </p>
    </div>
  );
}
