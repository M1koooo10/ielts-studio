import Link from "next/link";
import { requireAuth } from "@/server/auth/current";
import { getSessionStatus } from "@/server/ai/status";
import { tutorHistory } from "@/server/ai/tutor-store";
import { TeacherAvatar } from "@/features/settings/TeacherAvatar";
import { SectionHeading } from "@/components/SectionHeading";
import { modes, modeTitles } from "@/features/tutor/contracts";
import { TutorChat } from "@/features/tutor/TutorChat";
import "@/features/tutor/tutor.css";

export const metadata = { title: "AI Tutor" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const [owner, query, status] = await Promise.all([
    requireAuth(),
    searchParams,
    getSessionStatus(),
  ]);
  const mode = modes.find((m) => m === query.mode) ?? "coach";
  const history = await tutorHistory(owner.userId, mode);
  return (
    <>
      <SectionHeading title="AI Tutor" />
      <div className="tutor-intro">
        <TeacherAvatar size={62} />
        <div>
          <h2>Персональный преподаватель</h2>
          <p>
            {status === "connected" ? "OpenAI подключён" : "OpenAI отключён"} ·
            IELTS Academic
          </p>
        </div>
      </div>
      <nav aria-label="Режим преподавателя" className="tutor-modes">
        {modes.map((m) => (
          <Link
            className="studio-button btn-outline"
            key={m}
            aria-current={mode === m ? "page" : undefined}
            href={"/ai-tutor?mode=" + m}
          >
            {modeTitles[m]}
          </Link>
        ))}
      </nav>
      <TutorChat
        key={mode}
        mode={mode}
        connected={status === "connected"}
        history={history}
      />
    </>
  );
}
