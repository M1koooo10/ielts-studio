import type { Material } from "@/lib/contracts";
import {
  BookOpen,
  Headphones,
  Mic,
  NotebookPen,
  PencilLine,
  WholeWord,
} from "lucide-react";

export const librarySkills = {
  reading: { name: "Reading", icon: BookOpen },
  listening: { name: "Listening", icon: Headphones },
  writing: { name: "Writing", icon: PencilLine },
  speaking: { name: "Speaking", icon: Mic },
  grammar: { name: "Grammar", icon: NotebookPen },
  vocabulary: { name: "Vocabulary", icon: WholeWord },
} satisfies Record<Material["skill"], { name: string; icon: typeof BookOpen }>;
