import Link from "next/link";
import {
  ClipboardList,
  BookMarked,
  Gamepad2,
  NotebookTabs,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./SectionHeading";
const planned = {
  "mock-tests": {
    Icon: ClipboardList,
    heading: "Пока нет полных вариантов",
    body: "Для экзамена нужны полный комплект вопросов, аудио и таймер. Сейчас доступны отдельные материалы для знакомства с форматом.",
    next: "Каталог материалов",
    href: "/settings/library",
  },
  vocabulary: {
    Icon: NotebookTabs,
    heading: "Словарь пока пуст",
    body: "Сохранение слов и карточки с интервальным повторением появятся на этапе персонального обучения.",
    next: "Открыть материалы",
    href: "/settings/library",
  },
  arcade: {
    Icon: Gamepad2,
    heading: "Игры в разработке",
    body: "В пятой фазе здесь появятся диктанты, подбор коллокаций и упражнения на перефразирование.",
    next: "К практике",
    href: "/practice",
  },
  mistakes: {
    Icon: BookMarked,
    heading: "Записей об ошибках пока нет",
    body: "После подключения проверки упражнений здесь появятся ваши ответы, пояснения и материалы для повторения.",
    next: "Открыть практику",
    href: "/practice",
  },
};

export function PlannedSection({
  section,
  title,
}: {
  section: keyof typeof planned;
  title: string;
}) {
  const { Icon, heading, body, next, href } = planned[section];
  return (
    <>
      <SectionHeading title={title} />
      <section className="panel empty-module">
        <span className="empty-icon">
          <Icon />
        </span>
        <h2>{heading}</h2>
        <p>{body}</p>
        <Button asChild variant="secondary">
          <Link href={href}>{next}</Link>
        </Button>
      </section>
    </>
  );
}
