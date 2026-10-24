"use client";

import { SIM_CATALOG } from "@/game/career/content";
import { skillProgressList } from "@/game/knowledge/logic";
import { freelanceGoal } from "@/game/jobs/logic";
import { useGameStore } from "@/game/state/store";
import { PixelIcon } from "../PixelIcon";
import { StatBar } from "../StatBar";
import { RankBadge } from "./RankBadge";

const goal = freelanceGoal(SIM_CATALOG.milestones);

export function SkillRankPanel({ iconFiles }: { iconFiles: readonly string[] }) {
  const skills = useGameStore((s) => s.career.player_skills);
  const reputation = useGameStore((s) => s.career.players.reputation);
  const freelance = useGameStore((s) => s.career.players.freelance_completed);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
        <span className="inline-flex items-center gap-2">
          <PixelIcon name="reputation_medal" size={22} alt="" files={iconFiles} />
          Uy tín {reputation}
        </span>
        <span data-testid="freelance-count">
          Freelance {freelance}/{goal}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {skillProgressList(skills, SIM_CATALOG).map((skill) => (
          <li
            key={skill.id}
            data-testid={`skill-row-${skill.id}`}
            data-level={skill.level}
            data-xp={skill.xp}
            data-need={skill.xpToNext}
            data-rank={skill.rankId}
            className="flex items-center gap-3 rounded-[var(--radius-tile)] bg-white/70 p-2 shadow-chip"
          >
            <PixelIcon name={skill.icon} size={44} alt="" files={iconFiles} />
            <div className="min-w-0 flex-1">
              <p className="font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
                {skill.summary}
              </p>
              <p className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
                Cấp {skill.level} · {skill.xpLine}
              </p>
              <StatBar value={skill.levelPercent} tone="mint" stepped className="mt-1" />
            </div>
            <RankBadge rankId={skill.rankId} />
          </li>
        ))}
      </ul>
    </div>
  );
}
