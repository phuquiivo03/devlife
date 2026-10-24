"use client";

import React, { useRef } from "react";
import { SIM_CATALOG } from "@/game/career/content";
import { VITAL_MAX } from "@/game/state/playerStats";
import { calendar, holidayOn, isLowStat } from "@/game/life/logic";
import { useGameStore, type CareerPanel } from "@/game/state/store";
import { canSleepAt, phaseById, snapshot, type PhaseId } from "@/game/time";
import { resolveShippedIcon } from "@/lib/pixel-assets";
import { cn } from "@/lib/utils";
import { PixelIcon } from "./PixelIcon";
import { AudioButton } from "./AudioButton";
import { NotificationsButton } from "./NotificationsButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatVnd } from "@/lib/format-currency";
import { PixelButton } from "@/components/ui/button";
import { BUTTON_LIGHT } from "@/components/ui/button/config";
import { PanelCard } from "@/components/ui/panel-card";
import { StatBar } from "./StatBar";
import { HUD_ICON_GAP_PX } from "./store-button.config";
import {
  ROOM_STATUS_BAR,
  roomStatusBarVars,
  roomStatusClockLabel,
} from "./shell-layout.config";
import shellStyles from "./shell-layout.module.css";
import { HungerDock } from "./FoodPopup";
import { GameButton } from "./GameButton";
import { SleepButton } from "./SleepButton";
import { StoreButton } from "./StoreButton";
import { statFxVars } from "./stat-fx.config";
import { useTweenedNumber } from "./useTweenedNumber";
import { StatFlash, StatFloaters } from "./StatFx";
import { tweenMsFor } from "./stat-fx";

/** Native icon for the Kỹ năng button. Swap this name when a new file ships. */
export const SKILL_MENU_ICON = "skills";

const CAREER_ACTIONS = [
  {
    id: "study",
    testId: "open-study",
    label: "Học",
    icon: "learn_book",
  },
  {
    id: "jobs",
    testId: "open-jobs",
    label: "Việc làm",
    icon: "job",
  },
  {
    id: "skills",
    testId: "open-skills",
    label: "Kỹ năng",
    icon: SKILL_MENU_ICON,
  },
] as const satisfies readonly {
  id: CareerPanel;
  testId: string;
  label: string;
  icon: string;
}[];

/**
 * White top bar: devlife logo, Tiền chip, Ngày/giờ chip, notifications and
 * audio round buttons. The shop control moved to the ActionsCard.
 */
export function TopBar({
  iconFiles = [],
}: {
  iconFiles?: readonly string[];
}) {
  const money = useGameStore((s) => s.career.players.money);
  const prevMoneyRef = useRef(money);
  const moneyDelta = money - prevMoneyRef.current;
  prevMoneyRef.current = money;

  const tweenedMoney = useTweenedNumber(money, tweenMsFor("money", moneyDelta));
  const shownMoney = Math.round(tweenedMoney);

  const day = useGameStore((s) => snapshot(s.totalMinutes).day);
  const clockLabel = useGameStore((s) => snapshot(s.totalMinutes).clockLabel);
  const phaseId = useGameStore((s) => snapshot(s.totalMinutes).phaseId);
  const fastForward = useGameStore((s) => s.fastForward);
  const setAudioPopupOpen = useGameStore((s) => s.setAudioPopupOpen);
  const setNotificationOpen = useGameStore((s) => s.setNotificationOpen);
  const weekdayLabel = calendar(day).weekdayLabel;
  const phaseLabel = phaseById(phaseId).label;

  return (
    <PanelCard
      className={cn(
        shellStyles.statusBar,
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2",
      )}
      style={{
        ...roomStatusBarVars(),
        ...statFxVars(),
      }}
      data-testid="room-status-bar"
    >
      <span className="flex shrink-0 items-center gap-2 font-galmuri-11 text-galmuri-title-lg font-bold text-[var(--foreground)]">
        <span
          className="inline-block size-2.5 rounded-full bg-[var(--accent-violet)]"
          aria-hidden
        />
        devlife
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2">
        <span className="hud-chip relative whitespace-nowrap" style={{ position: "relative" }}>
          <PixelIcon name="savings" size={ROOM_STATUS_BAR.iconPx} alt="" />
          <span
            data-testid="hud-money"
            style={{
              color:
                shownMoney > 0
                  ? "var(--accent-mint)"
                  : "var(--accent-coral)",
            }}
          >
            {formatVnd(shownMoney)}
          </span>
          <StatFlash statKey="money" />
          <StatFloaters statKey="money" />
        </span>
        <span
          className={cn("hud-chip whitespace-nowrap", fastForward && "fast-forward-flash")}
          data-testid="game-clock"
          data-day={day}
          data-weekday={weekdayLabel}
          data-holiday={holidayOn(day) ?? ""}
          data-time={clockLabel}
          data-phase={phaseId}
          data-fast-forward={fastForward ? "1" : "0"}
        >
          <PhaseMark phaseId={phaseId} iconFiles={iconFiles} />
          <span>
            {roomStatusClockLabel(day, weekdayLabel, clockLabel, phaseLabel)}
          </span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <NotificationsButton
          iconFiles={iconFiles}
          compact
          onOpen={() => setNotificationOpen(true)}
        />
        <AudioButton
          iconFiles={iconFiles}
          compact
          onOpen={() => setAudioPopupOpen(true)}
        />
      </div>
    </PanelCard>
  );
}

/** The four vitals as pill rows: label chip, current/max, progress bar. */
export function StatsCard({ clay = false }: { clay?: boolean }) {
  const health = useGameStore((s) => s.career.players.health);
  const mood = useGameStore((s) => s.career.players.mood);
  const energy = useGameStore((s) => s.career.players.energy);
  const fullness = useGameStore((s) => s.career.players.fullness);
  const energyMax = SIM_CATALOG.config.energy_max;

  return (
    <PanelCard className="shrink-0 p-4" style={statFxVars()}>
      <ul className="flex flex-col gap-3">
        <StatRow
          icon="health"
          label="Sức khỏe"
          value={health}
          max={VITAL_MAX}
          tone="coral"
          testId="hud-health"
          alert={isLowStat("health", health)}
          statKey="health"
          clay={clay}
        />
        <StatRow
          icon="mood"
          label="Tinh thần"
          value={mood}
          max={VITAL_MAX}
          tone="mint"
          testId="hud-mood"
          alert={mood < 15}
          statKey="mood"
          clay={clay}
        />
        <StatRow
          icon="energy"
          label="Năng lượng"
          value={energy}
          max={energyMax}
          tone="sky"
          testId="hud-energy"
          alert={energy < 15}
          statKey="energy"
          clay={clay}
        />
        <StatRow
          icon="food"
          label="No bụng"
          value={fullness}
          max={VITAL_MAX}
          tone="amber"
          testId="hud-fullness"
          alert={isLowStat("fullness", fullness)}
          statKey="fullness"
          clay={clay}
        />
      </ul>
    </PanelCard>
  );
}

const PILL_TONE: Record<
  "coral" | "mint" | "sky" | "amber",
  { background: string; ink: string }
> = {
  coral: { background: "var(--pill-coral)", ink: "#c24744" },
  mint: { background: "var(--pill-mint)", ink: "#2f8f68" },
  sky: { background: "var(--pill-sky)", ink: "#33689f" },
  amber: { background: "var(--pill-amber)", ink: "#a66a0b" },
};

function StatRow({
  icon,
  label,
  value,
  max,
  tone,
  testId,
  alert = false,
  statKey,
  clay = false,
}: {
  icon: string;
  label: string;
  value: number;
  max: number;
  tone: "coral" | "mint" | "sky" | "amber";
  testId: string;
  alert?: boolean;
  statKey: "health" | "mood" | "energy" | "fullness";
  clay?: boolean;
}) {
  const tweened = useTweenedNumber(value, 500);
  const shown = Math.round(value);
  const tweenedShown = Math.round(tweened);
  const pill = PILL_TONE[tone];

  // Clay variant: the label lives inside the thick pill (StatBar variant
  // "clay"); only the current value stays outside, next to the bar.
  if (clay) {
    return (
      <li
        className="hud-vital relative flex min-w-0 items-center gap-2.5"
        data-testid={testId}
        data-value={shown}
        data-max={max}
        data-alert={alert ? "1" : "0"}
      >
        <StatFlash statKey={statKey} />
        <StatFloaters statKey={statKey} />
        <StatBar
          variant="clay"
          tone={tone}
          value={tweened}
          max={max}
          instant
          icon={icon}
          label={label}
          alert={alert}
        />
      </li>
    );
  }

  return (
    <li
      className={
        alert
          ? "hud-vital stat-blink relative min-w-0"
          : "hud-vital relative min-w-0"
      }
      data-testid={testId}
      data-value={shown}
      data-max={max}
      data-alert={alert ? "1" : "0"}
    >
      <StatFlash statKey={statKey} />
      <StatFloaters statKey={statKey} />
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <PixelIcon name={icon} size={22} alt="" />
          <span
            className="truncate rounded-[var(--radius-chip)] px-3 py-0.5 font-galmuri-7 text-galmuri-small"
            style={{ background: pill.background, color: pill.ink }}
          >
            {label}
          </span>
        </span>
        <span className="font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
          {tweenedShown}/{max}
        </span>
      </div>
      <StatBar value={tweened} max={max} tone={tone} instant />
    </li>
  );
}

/** Action tiles (Ăn, Chơi game, Đi ngủ, Học, Việc làm, Kỹ năng) + Cửa hàng. */
export function ActionsCard({
  iconFiles = [],
  clay = false,
}: {
  iconFiles?: readonly string[];
  clay?: boolean;
}) {
  const canSleep = useGameStore((s) => canSleepAt(s.totalMinutes));
  const sleep = useGameStore((s) => s.sleep);
  const openCareerPanel = useGameStore((s) => s.openCareerPanel);
  const setStoreOpen = useGameStore((s) => s.setStoreOpen);

  return (
    <PanelCard className="flex shrink-0 flex-col gap-3 p-4" style={statFxVars()}>
      <div
        className="flex flex-wrap justify-end"
        style={{ gap: clay ? 10 : HUD_ICON_GAP_PX }}
        data-testid="hud-icon-bar"
      >
        <ActionTile label="Ăn" tone="eat" clay={clay}>
          <HungerDock clay={clay} />
        </ActionTile>
        <ActionTile label="Chơi game" tone="game" clay={clay}>
          <GameButton clay={clay} />
        </ActionTile>
        <ActionTile label="Đi ngủ" tone="sleep" clay={clay}>
          <SleepButton canSleep={canSleep} onSleep={sleep} clay={clay} />
        </ActionTile>
        {CAREER_ACTIONS.map((action) => (
          <CareerTile
            key={action.id}
            action={action}
            iconFiles={iconFiles}
            onClick={() => openCareerPanel(action.id)}
            clay={clay}
          />
        ))}
      </div>
      <StoreButton wide clay={clay} onOpen={() => setStoreOpen(true)} />
    </PanelCard>
  );
}

/** Icon control with its name underneath, matching the career tiles. */
function ActionTile({
  label,
  tone,
  clay = false,
  children,
}: {
  label: string;
  tone: "eat" | "game" | "sleep";
  clay?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[88px] flex-col items-center gap-1",
        clay
          ? "clay-tile w-[calc((100%-20px)/3)] py-1.5"
          : "w-[calc((100%-16px)/3)]",
      )}
      data-clay-tone={clay ? tone : undefined}
    >
      {children}
      <span
        className={cn(
          "font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]",
          clay && "clay-tile-label",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function CareerTile({
  action,
  iconFiles,
  onClick,
  clay = false,
}: {
  action: (typeof CAREER_ACTIONS)[number];
  iconFiles: readonly string[];
  onClick: () => void;
  clay?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[88px]",
        clay
          ? "clay-tile w-[calc((100%-20px)/3)] py-1.5"
          : "w-[calc((100%-16px)/3)]",
      )}
      data-clay-tone={clay ? action.id : undefined}
    >
      <PixelButton
        type="button"
        variant="light"
        data-testid={action.testId}
        data-icon-key={action.icon}
        onClick={onClick}
        aria-label={action.label}
        className={cn("w-full", clay && "clay-tile-inner")}
      >
        <span className="flex w-full flex-col items-center gap-1 py-1">
          <PixelIcon
            name={action.icon}
            size={BUTTON_LIGHT.iconPx}
            alt=""
            files={iconFiles}
          />
          <span>{action.label}</span>
        </span>
      </PixelButton>
    </div>
  );
}

function PhaseMark({
  phaseId,
  iconFiles,
}: {
  phaseId: PhaseId;
  iconFiles: readonly string[];
}) {
  const phase = phaseById(phaseId);
  const size = ROOM_STATUS_BAR.iconPx;
  const art = resolveShippedIcon(phase.iconKey, size, iconFiles);
  return (
    <span className="inline-flex items-center text-[var(--foreground)]">
      <span data-icon-key={phase.iconKey} className="inline-flex">
        {art ? (
          <PixelIcon
            name={phase.iconKey}
            size={size}
            alt=""
            files={iconFiles}
          />
        ) : (
          <span
            className="inline-flex items-center justify-center text-[16px] leading-4"
            style={{ width: size, height: size }}
            role="img"
            aria-label={phase.label}
          >
            {phase.emoji}
          </span>
        )}
      </span>
    </span>
  );
}
