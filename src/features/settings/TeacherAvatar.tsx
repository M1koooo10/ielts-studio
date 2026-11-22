import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { AudioLines } from "lucide-react";
import "./settings.css";

export type AvatarState =
  "idle" | "listening" | "thinking" | "speaking" | "positive";

export function TeacherAvatar({
  state = "idle",
  size = 64,
}: {
  state?: AvatarState;
  size?: number;
}) {
  const available = existsSync(
    path.join(process.cwd(), "public", "avatars", "ai-teacher.png"),
  );
  return (
    <span
      className="teacher-avatar"
      data-avatar-state={state}
      style={{ width: size, height: size }}
    >
      {available ? (
        <Image
          src="/avatars/ai-teacher.png"
          alt="Аватар AI Tutor"
          width={size}
          height={size}
          unoptimized
        />
      ) : (
        <AudioLines
          aria-label="AI Tutor"
          role="img"
          size={Math.round(size * 0.46)}
        />
      )}
    </span>
  );
}
