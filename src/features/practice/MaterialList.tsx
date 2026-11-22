import Link from "next/link";
import { BookOpenText, ChevronRight, Clock3 } from "lucide-react";
import type { Material } from "@/lib/contracts";
export function MaterialList({ items }: { items: Pick<Material,"slug"|"title"|"minutes"|"description"|"cefr">[] }) {
  return (
    <div className="material-list">
      {items.map((m) => (
        <Link
          className="material-item"
          href={"/settings/library/" + m.slug}
          key={m.slug}
        >
          <span className="doc-icon">
            <BookOpenText size={23} />
          </span>
          <span>
            <strong lang="en">{m.title}</strong>
            <small>{m.description}</small>
          </span>
          <span className="material-minutes">
            <Clock3 size={14} />
            {m.cefr} · {m.minutes} мин
          </span>
          <ChevronRight size={17} />
        </Link>
      ))}
    </div>
  );
}
