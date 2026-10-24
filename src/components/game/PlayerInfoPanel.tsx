"use client";

import type { CSSProperties } from "react";
import { SIM_CATALOG } from "@/game/career/content";
import { overallRankBracket, skillProgressList, type SkillProgress } from "@/game/knowledge/logic";
import { freelanceGoal } from "@/game/jobs/logic";
import { STUB_PLAYER } from "@/game/state/playerStats";
import { useGameStore } from "@/game/state/store";
import { LIFE } from "@/game/life/content";
import { lifeOf, rentStatus } from "@/game/life/logic";
import { traitDef, traitDetail, traitIconSrc, traitOf } from "@/game/life/traits";
import { snapshot } from "@/game/time";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { StageId } from "@/game/config";
import { STAGE_LABELS } from "@/lib/stage-labels";
import { PanelCard } from "@/components/ui/panel-card";
import { RankBadge } from "./career/RankBadge";
import { PixelIcon } from "./PixelIcon";
import { PixelAvatar } from "./PixelAvatar";
import { StatBar } from "./StatBar";
import { statFxVars } from "./stat-fx.config";
import { useTweenedNumber } from "./useTweenedNumber";
import { StatFlash, StatFloaters } from "./StatFx";

const goal = freelanceGoal(SIM_CATALOG.milestones);

/** Same CSS size as the Danh tiếng and Freelance icons on this card. */
const TRAIT_ICON_PX = 22;

/** Presentational overall level/XP: the sum of the five catalog skills. */
function overallXp(skills: SkillProgress[]) {
  const level = skills.reduce((sum, skill) => sum + skill.level, 0);
  const xp = skills.reduce((sum, skill) => sum + skill.xp, 0);
  const need = skills.reduce((sum, skill) => sum + skill.xpToNext, 0);
  return { level, xp, need };
}

export function ProfileCard({
  iconFiles = [],
  clay = false,
}: {
  iconFiles?: readonly string[];
  clay?: boolean;
}) {
  const p = STUB_PLAYER;
  const stage = useGameStore((s) => s.stage);
  const career = useGameStore((s) => s.career);
  const day = useGameStore((s) => snapshot(s.totalMinutes).day);
  const playerSkills = useGameStore((s) => s.career.player_skills);
  const reputation = useGameStore((s) => s.career.players.reputation);
  const freelance = useGameStore((s) => s.career.players.freelance_completed);
  const skills = skillProgressList(playerSkills, SIM_CATALOG);
  const overall = overallRankBracket(
    skills.map((skill) => skill.level),
    SIM_CATALOG.config.rank_brackets,
  );
  const life = lifeOf(career);
  const trait = traitDef(traitOf(career));
  const rent = rentStatus(career, day);
  const sick = career.players.health < LIFE.sick_below;
  const burned = life.burnoutDay === day;
  const xp = overallXp(skills);

  const tweenedRep = useTweenedNumber(reputation, 500);

  // Clay (3D) variant: round avatar + name row, one XP line, and the
  // reputation/freelance/rent rows folded into small chips. Same data,
  // same data-testids as the 2D card.
  if (clay) {
    return (
      <PanelCard className="flex shrink-0 flex-col p-4" style={statFxVars()}>
        <div className="flex items-center gap-3">
          <div className="clay-avatar">
            <PixelAvatar role="player" size={56} alt={p.name} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="clay-name">{p.name}</p>
              <RankBadge rankId={overall.id} size={24} />
            </div>
            <p
              className="clay-subtitle"
              data-testid="player-rank"
              data-rank={overall.id}
            >
              {STAGE_LABELS[stage as StageId]} · {overall.label}
            </p>
          </div>
        </div>
        <div
          className="mt-3 w-full"
          style={{ "--clay-stat-h": "10px" } as CSSProperties}
        >
          <p className="clay-xp-label">
            Lv. {xp.level} · {xp.xp}/{xp.need} XP
          </p>
          <StatBar
            variant="clay"
            tone="exp"
            value={xp.xp}
            max={xp.need}
            showValue={false}
            className="mt-1"
          />
        </div>
        <div className="clay-chip-row mt-3">
          <Tooltip>
            <TooltipTrigger
              className="clay-chip cursor-pointer border-0 bg-transparent p-0 font-inherit text-inherit pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              data-testid="player-trait"
              data-trait={trait.id}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- trait icons stay pixelated */}
              <img
                src={traitIconSrc(trait.icon)}
                width={TRAIT_ICON_PX}
                height={TRAIT_ICON_PX}
                alt=""
                draggable={false}
                className="pixelated size-auto max-w-none shrink-0"
                style={{
                  width: TRAIT_ICON_PX,
                  height: TRAIT_ICON_PX,
                  minWidth: TRAIT_ICON_PX,
                  minHeight: TRAIT_ICON_PX,
                }}
              />
              <span>{trait.name}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" data-testid="player-trait-tip">
              {traitDetail(trait)}
            </TooltipContent>
          </Tooltip>
          <span className="clay-chip">
            <PixelIcon name="reputation_medal" size={22} alt="" files={iconFiles} />
            <span data-testid="player-reputation">{Math.round(tweenedRep)}</span>
            <StatFlash statKey="reputation" />
            <StatFloaters statKey="reputation" />
          </span>
          <span className="clay-chip">
            <PixelIcon name="job_freelance" size={22} alt="" files={iconFiles} />
            <span
              data-testid="player-freelance"
              data-value={freelance}
              data-goal={goal}
            >
              {freelance}/{goal}
            </span>
          </span>
          <span
            className="clay-chip"
            data-testid="life-rent"
            data-rent={rent}
            data-debt={life.rentDebtDays}
          >
            {rent === "paid"
              ? "Trọ tháng này: đã đóng"
              : rent === "late"
                ? `Nợ trọ: ${life.rentDebtDays} ngày`
                : "Trọ đóng vào ngày 1"}
          </span>
        </div>
        {sick ? (
          <p className="clay-warn mt-2" data-testid="life-sick">
            Đang ốm
          </p>
        ) : null}
        {burned ? (
          <p className="clay-warn mt-1" data-testid="life-burnout">
            Hôm nay kiệt sức, chưa nhận freelance
          </p>
        ) : null}
      </PanelCard>
    );
  }

  return (
    <PanelCard className="flex shrink-0 flex-col items-center p-3" style={statFxVars()}>
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-[var(--room-frame)] bg-[var(--scene-plate)]">
        <PixelAvatar role="player" size={80} alt={p.name} />
      </div>
      <div className="mt-2 flex items-center justify-center gap-1">
        <p className="font-galmuri-11 text-galmuri-title text-[var(--foreground)]">{p.name}</p>
        <RankBadge rankId={overall.id} size={24} />
      </div>
      <p
        className="mt-1 font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]"
        data-testid="player-rank"
        data-rank={overall.id}
      >
        {STAGE_LABELS[stage as StageId]} · {overall.label}
      </p>
      <div className="mt-2 w-full">
        <div className="flex items-center justify-between font-galmuri-7 text-galmuri-small">
          <span className="text-[var(--foreground)]">Lv. {xp.level}</span>
          <span className="text-[var(--muted-foreground)]">
            {xp.xp}/{xp.need} XP
          </span>
        </div>
        <StatBar value={xp.xp} max={xp.need} tone="exp" stepped className="mt-1" />
      </div>
      <Tooltip>
        <TooltipTrigger
          className="mt-2 flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left font-inherit text-inherit pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          data-testid="player-trait"
          data-trait={trait.id}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- trait icons stay pixelated */}
          <img
            src={traitIconSrc(trait.icon)}
            width={TRAIT_ICON_PX}
            height={TRAIT_ICON_PX}
            alt=""
            draggable={false}
            className="pixelated size-auto max-w-none shrink-0"
            style={{
              width: TRAIT_ICON_PX,
              height: TRAIT_ICON_PX,
              minWidth: TRAIT_ICON_PX,
              minHeight: TRAIT_ICON_PX,
            }}
          />
          <span className="min-w-0 flex-1 font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
            {trait.name}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" data-testid="player-trait-tip">
          {traitDetail(trait)}
        </TooltipContent>
      </Tooltip>
      {sick ? (
        <p className="mt-1 font-galmuri-7 text-galmuri-small text-[var(--accent-coral)]" data-testid="life-sick">
          Đang ốm
        </p>
      ) : null}
      {burned ? (
        <p className="mt-1 font-galmuri-7 text-galmuri-small text-[var(--accent-coral)]" data-testid="life-burnout">
          Hôm nay kiệt sức, chưa nhận freelance
        </p>
      ) : null}
      <div className="mt-2 flex w-full items-center gap-2 text-left relative">
        <PixelIcon name="reputation_medal" size={22} alt="" files={iconFiles} />
        <span className="flex-1 font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
          Danh tiếng
        </span>
        <span
          className="font-galmuri-9 text-galmuri-body text-[var(--foreground)]"
          data-testid="player-reputation"
        >
          {Math.round(tweenedRep)}
        </span>
        <StatFlash statKey="reputation" />
        <StatFloaters statKey="reputation" />
      </div>
      <div className="mt-1 flex w-full items-center gap-2 text-left">
        <PixelIcon name="job_freelance" size={22} alt="" files={iconFiles} />
        <span className="flex-1 font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
          Freelance
        </span>
        <span
          className="font-galmuri-9 text-galmuri-body text-[var(--foreground)]"
          data-testid="player-freelance"
          data-value={freelance}
          data-goal={goal}
        >
          {freelance}/{goal}
        </span>
      </div>
      <StatBar value={freelance} max={goal} tone="mint" className="mt-1" />
      <p
        className="mt-2 w-full text-left font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]"
        data-testid="life-rent"
        data-rent={rent}
        data-debt={life.rentDebtDays}
      >
        {rent === "paid"
          ? "Trọ tháng này: đã đóng"
          : rent === "late"
            ? `Nợ trọ: ${life.rentDebtDays} ngày`
            : "Trọ đóng vào ngày 1"}
      </p>
    </PanelCard>
  );
}

export function SkillsCard({
  iconFiles = [],
}: {
  iconFiles?: readonly string[];
}) {
  const playerSkills = useGameStore((s) => s.career.player_skills);
  const skills = skillProgressList(playerSkills, SIM_CATALOG);

  return (
    <PanelCard className="shrink-0 px-4 pb-2 pt-3">
      {/* Collapsed by default so the sidebar fits the first screen; the
          summary keeps the card a single tap away. */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-galmuri-11 text-galmuri-title text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
          <h2 className="font-normal">Kỹ năng</h2>
          <span
            className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)] transition-transform group-open:rotate-180"
            aria-hidden
          >
            ▾
          </span>
        </summary>
        <ul data-testid="player-skills">
          {skills.map((skill) => (
            <PlayerSkillRow key={skill.id} skill={skill} iconFiles={iconFiles} />
          ))}
        </ul>
      </details>
    </PanelCard>
  );
}

function PlayerSkillRow({
  skill,
  iconFiles,
}: {
  skill: SkillProgress;
  iconFiles: readonly string[];
}) {
  return (
    <li
      data-testid={`player-skill-${skill.id}`}
      data-level={skill.level}
      data-xp={skill.xp}
      data-need={skill.xpToNext}
      data-rank={skill.rankId}
      data-rank-percent={skill.rankPercent}
      className="flex items-center gap-2 border-b border-dashed border-[var(--panel-border)] py-2 last:border-b-0"
    >
      <PixelIcon name={skill.icon} size={22} alt="" files={iconFiles} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
            {skill.name}
          </span>
          <RankBadge rankId={skill.rankId} size={24} />
        </div>
        <p className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
          {skill.rankLabel} {skill.rankPercent}%
        </p>
        <StatBar value={skill.rankPercent} tone="mint" stepped className="mt-1" />
      </div>
    </li>
  );
}
