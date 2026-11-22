import {StartButton} from "@/features/practice/StartButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMaterial } from "@/server/db";
import { librarySkills } from "@/features/library/labels";
import "@/features/settings/settings.css";

export const dynamic = "force-dynamic";

export default async function MaterialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const material = await getMaterial((await params).slug);
  if (!material) notFound();
  const { name, icon: Icon } = librarySkills[material.skill];
  return (
    <article className="sf-page material-detail">
      <header className="sf-page-heading">
        <Link className="sf-back" href="/settings/library">
          Библиотека материалов
        </Link>
        <h1 lang="en">{material.title}</h1><StartButton slug={material.slug}/>
        <p className="library-skill">
          <Icon size={17} />
          {name} · {material.cefr} · {material.minutes} мин
        </p>
      </header>
      <section className="sf-card">
        <h2>Материал</h2>
        <div className="library-text" lang="en">
          {material.body}
        </div>
      </section>
      <section className="sf-card">
        <h2>Задание</h2>
        <p className="library-text" lang="en">
          {material.instructions}
        </p>
        {!!material.questions.length && (
          <ol className="library-questions" lang="en">
            {material.questions.map((question, index) => (
              <li key={index}>
                <span>{question.prompt}</span>
                {!!question.options.length && (
                  <ul>
                    {question.options.map((option) => (
                      <li key={option}>{option}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
      
    </article>
  );
}
