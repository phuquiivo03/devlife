"use client";

import { useEffect, useState } from "react";
import { SIM_CATALOG } from "@/game/career/content";
import { gameBus } from "@/game/events/bus";
import { VITAL_MAX } from "@/game/state/playerStats";
import { calendar, holidayOn } from "@/game/life/logic";
import { useGameStore, type CareerPanel } from "@/game/state/store";
import { canSleepAt, phaseById, snapshot, type PhaseId } from "@/game/time";
import { resolveShippedIcon } from "@/lib/pixel-assets";
import { cn } from "@/lib/utils";
import { AudioControls } from "./AudioControls";
import { PixelIcon } from "./PixelIcon";
import { formatVnd } from "@/lib/format-currency";
import { PixelButton } from "@/components/ui/button";
import { BUTTON_LIGHT } from "@/components/ui/button/config";
import { PanelCard } from "@/components/ui/panel-card";
import { StatBar } from "./StatBar";
import { HUD_ICON_GAP_PX } from "./store-button.config";
import { ROOM_STATUS_BAR, roomStatusBarVars, roomStatusClockLabel } from "./shell-layout.config";
import shellStyles from "./shell-layout.module.css";
import { HungerDock } from "./FoodPopup";
import { SleepButton } from "./SleepButton";
import { StoreButton } from "./StoreButton";

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

/** Tiền, Ngày/giờ, and Cửa hàng. GameShell places this directly above the room. */
export function RoomStatusBar({ iconFiles = [] }: { iconFiles?: readonly string[] }) {
  const money = useGameStore((s) => s.career.players.money);
  const day = useGameStore((s) => snapshot(s.totalMinutes).day);
  const clockLabel = useGameStore((s) => snapshot(s.totalMinutes).clockLabel);
  const phaseId = useGameStore((s) => snapshot(s.totalMinutes).phaseId);
  const fastForward = useGameStore((s) => s.fastForward);
  const setStoreOpen = useGameStore((s) => s.setStoreOpen);
  const weekdayLabel = calendar(day).weekdayLabel;
  const phaseLabel = phaseById(phaseId).label;

  return (
    <PanelCard
      className={cn(shellStyles.statusBar, "font-galmuri-7 text-galmuri-small")}
      style={roomStatusBarVars()}
      data-testid="room-status-bar"
    >
      <span className={shellStyles.cluster}>
        <PixelIcon name="savings" size={ROOM_STATUS_BAR.iconPx} alt="" />
        <span data-testid="hud-money">{formatVnd(money)}</span>
      </span>
      <span
        className={cn(shellStyles.cluster, fastForward && "fast-forward-flash")}
        data-testid="game-clock"
        data-day={day}
        data-weekday={weekdayLabel}
        data-holiday={holidayOn(day) ?? ""}
        data-time={clockLabel}
        data-phase={phaseId}
        data-fast-forward={fastForward ? "1" : "0"}
      >
        <PhaseMark phaseId={phaseId} iconFiles={iconFiles} />
        <span>{roomStatusClockLabel(day, weekdayLabel, clockLabel, phaseLabel)}</span>
      </span>
      <span className={shellStyles.shop}>
        <StoreButton onOpen={() => setStoreOpen(true)} />
      </span>
    </PanelCard>
  );
}

export function PlayerHudCard({ iconFiles = [] }: { iconFiles?: readonly string[] }) {
  const health = useGameStore((s) => s.career.players.health);
  const mood = useGameStore((s) => s.career.players.mood);
  const energy = useGameStore((s) => s.career.players.energy);
  const sleep = useGameStore((s) => s.sleep);
  const canSleep = useGameStore((s) => canSleepAt(s.totalMinutes));
  const openCareerPanel = useGameStore((s) => s.openCareerPanel);

  const energyMax = SIM_CATALOG.config.energy_max;
  const floaters = useVitalFloaters();

  return (
    <PanelCard className="w-full max-w-[520px] p-3">
      <div className="grid grid-cols-3 gap-2">
        <HudVital
          icon="health"
          label="Sức khỏe"
          value={health}
          max={VITAL_MAX}
          tone="coral"
          testId="hud-health"
          alert={health < 30}
          floater={floaters.health}
        />
        <HudVital
          icon="mood"
          label="Tinh thần"
          value={mood}
          max={VITAL_MAX}
          tone="mint"
          testId="hud-mood"
          alert={mood < 15}
          floater={floaters.mood}
        />
        <HudVital
          icon="energy"
          label="Năng lượng"
          value={energy}
          max={energyMax}
          tone="sky"
          testId="hud-energy"
          alert={energy < 15}
          floater={floaters.energy}
        />
      </div>
      <div className="mt-3 flex items-center">
        <div
          className="inline-flex max-w-full flex-wrap items-center justify-end"
          data-testid="hud-icon-bar"
          style={{ marginLeft: "auto", gap: HUD_ICON_GAP_PX }}
        >
          <HungerDock />
          <SleepButton canSleep={canSleep} onSleep={sleep} />
        </div>
      </div>
      <div className="hud-actions mt-3">
        <div className="hud-actions-grid">
          {CAREER_ACTIONS.map((action) => (
            <CareerHudButton
              key={action.id}
              action={action}
              iconFiles={iconFiles}
              onClick={() => openCareerPanel(action.id)}
            />
          ))}
        </div>
      </div>
      <AudioControls iconFiles={iconFiles} />
    </PanelCard>
  );
}

function useVitalFloaters(): { health: string | null; mood: string | null; energy: string | null } {
  const [notes, setNotes] = useState<{ health: string | null; mood: string | null; energy: string | null }>({
    health: null,
    mood: null,
    energy: null,
  });

  useEffect(() => {
    let pending = { health: 0, mood: 0, energy: 0, count: 0 };
    let timer = 0;
    const flush = () => {
      const count = pending.count;
      const next = {
        health: pending.health === 0 ? null : formatDelta(count > 3 ? pending.health : pending.health),
        mood: pending.mood === 0 ? null : formatDelta(pending.mood),
        energy: pending.energy === 0 ? null : formatDelta(pending.energy),
      };
      if (count > 3) {
        const merged = pending.health + pending.mood + pending.energy;
        setNotes({ health: formatDelta(merged), mood: null, energy: null });
      } else {
        setNotes(next);
      }
      pending = { health: 0, mood: 0, energy: 0, count: 0 };
      window.setTimeout(() => setNotes({ health: null, mood: null, energy: null }), 1200);
    };
    const push = (key: "health" | "mood" | "energy", delta: number) => {
      if (delta === 0) return;
      pending[key] += delta;
      pending.count += 1;
      window.clearTimeout(timer);
      timer = window.setTimeout(flush, 40);
    };
    const offs = [
      gameBus.on("healthChanged", (event) => push("health", event.delta)),
      gameBus.on("moodChanged", (event) => push("mood", event.delta)),
      gameBus.on("energyChanged", (event) => push("energy", event.delta)),
    ];
    return () => {
      window.clearTimeout(timer);
      offs.forEach((off) => off());
    };
  }, []);

  return notes;
}

function formatDelta(value: number): string {
  const shown = Math.round(value);
  return shown > 0 ? `+${shown}` : `${shown}`;
}

function HudVital({
  icon,
  label,
  value,
  max,
  tone,
  testId,
  alert = false,
  floater = null,
}: {
  icon: string;
  label: string;
  value: number;
  max: number;
  tone: "coral" | "mint" | "sky";
  testId: string;
  alert?: boolean;
  floater?: string | null;
}) {
  const shown = Math.round(value);
  return (
    <div
      className={alert ? "hud-vital stat-blink relative min-w-0" : "hud-vital relative min-w-0"}
      data-testid={testId}
      data-value={shown}
      data-max={max}
      data-alert={alert ? "1" : "0"}
    >
      {floater ? (
        <span className="vital-floater font-galmuri-7 text-galmuri-small" data-testid={`${testId}-floater`}>
          {floater}
        </span>
      ) : null}
      <div className="hud-vital-head mb-1">
        <PixelIcon name={icon} size={22} alt="" />
        <span className="flex min-w-0 flex-col font-galmuri-7 text-galmuri-small leading-tight">
          <span className="whitespace-nowrap text-[var(--muted-foreground)]">{label}</span>
          <span className="whitespace-nowrap text-[var(--foreground)]">
            {shown}/{max}
          </span>
        </span>
      </div>
      <StatBar value={value} max={max} tone={tone} />
    </div>
  );
}

function CareerHudButton({
  action,
  iconFiles,
  onClick,
}: {
  action: (typeof CAREER_ACTIONS)[number];
  iconFiles: readonly string[];
  onClick: () => void;
}) {
  return (
    <PixelButton
      type="button"
      variant="light"
      data-testid={action.testId}
      data-icon-key={action.icon}
      onClick={onClick}
    >
      <PixelIcon name={action.icon} size={BUTTON_LIGHT.iconPx} alt="" files={iconFiles} />
      <span>{action.label}</span>
    </PixelButton>
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
          <PixelIcon name={phase.iconKey} size={size} alt="" files={iconFiles} />
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
