import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { skills } from "@/lib/navigation";
import type { Dashboard } from "@/lib/contracts";

function SkillArt({ kind }: { kind: string }) {
  return (
    <svg
      className="skill-art"
      viewBox="0 0 122 68"
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
      {kind === "reading" && (
        <g
          stroke="currentColor"
          strokeWidth="1.3"
          transform="rotate(-13 83 40)"
        >
          {[0, 7, 14].map((i) => (
            <path key={i} d={`M21 ${32 + i}l36 -13 34 10 -36 15z`} />
          ))}
          <path d="M29 30l27-9 23 7-26 10z" />
        </g>
      )}
      {kind === "listening" && (
        <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          {[3, 8, 15, 9, 20, 31, 16, 10, 24, 36, 20, 11, 27, 18, 9, 4].map(
            (h, i) => (
              <path key={i} d={`M${25 + i * 5} ${36 - h / 2}v${h}`} />
            ),
          )}
        </g>
      )}
      {kind === "writing" && (
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M19 48c13 1 43-25 42-35-2-8-24 19-22 30 3 12 17-18 19-14 1 3-5 13-1 14s12-14 12-12-8 12 0 11 11-7 15-6 9 2 14-1" />
          <path d="M36 52c21-7 44-9 61-8" />
        </g>
      )}
      {kind === "speaking" && (
        <g
          stroke="currentColor"
          strokeWidth="1.35"
          transform="rotate(-8 69 34)"
        >
          <path d="M31 14h39a13 13 0 0 1 13 13v3a13 13 0 0 1-13 13H49l-13 9 2-10a13 13 0 0 1-12-12v-4a12 12 0 0 1 5-12Z" />
          <path d="M83 26h5a11 11 0 0 1 11 11v3a11 11 0 0 1-9 11l2 8-12-7H66a12 12 0 0 1-12-9" />
          {[44, 54, 64].map((x) => (
            <circle key={x} cx={x} cy="28" r="1.6" fill="currentColor" />
          ))}
        </g>
      )}
    </svg>
  );
}
export function Skills({ bands }: { bands: Dashboard["skillBands"] }) {
  return (
    <div className="skill-grid">
      {skills.map(({ key, title, label, icon: Icon }) => (
        <Link
          href={"/practice/" + key}
          className={"skill-card " + key}
          key={key}
        >
          <div className="skill-top">
            <span className="skill-icon">
              <Icon size={22} />
            </span>
            <ArrowUpRight size={16} className="card-arrow" />
          </div>
          <strong lang="en">{title}</strong>
          <span className="skill-sub">{label}</span>
          <SkillArt kind={key} />
          {bands[key] !== null && <small>Band {bands[key]?.toFixed(1)}</small>}
        </Link>
      ))}
    </div>
  );
}
