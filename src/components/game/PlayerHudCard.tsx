"use client";

import React, { useRef } from "react";
import { SIM_CATALOG } from "@/game/career/content";
import { VITAL_MAX } from "@/game/state/playerStats";
import { calendar, holidayOn } from "@/game/life/logic";
import { useGameStore, type CareerPanel } from "@/game/state/store";
import { canSleepAt, phaseById, snapshot, type PhaseId } from "@/game/time";
import { resolveShippedIcon } from "@/lib/pixel-assets";
import { cn } from "@/lib/utils";
import { AudioControls } from "./AudioControls";
import { PixelIcon } from "./PixelIcon";
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
import { chamferClipStyle } from "@/lib/chamfer-frame";

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
export function RoomStatusBar({
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
  const setStoreOpen = useGameStore((s) => s.setStoreOpen);
  const weekdayLabel = calendar(day).weekdayLabel;
  const phaseLabel = phaseById(phaseId).label;

  return (
    <div className="">
      <div
        className=" mt-6 chamfer-frame-f2 p-[2px] flex justify-center"
        style={{ ...chamferClipStyle(8) }}
      >
        <PanelCard
          className={cn(
            shellStyles.statusBar,
            "font-galmuri-7 text-galmuri-small flex justify-between",
          )}
          style={{
            ...roomStatusBarVars(),
            ...statFxVars(),
            ...chamferClipStyle(8),
          }}
          data-testid="room-status-bar"
        >
          <span className="font-galmuri-11 text-galmuri-title-lg text-[var(--foreground)] font-bold">
            devlife
          </span>
          <div className="hidden lg:flex gap-6 ">
            <span
              className={shellStyles.cluster}
              style={{ position: "relative" }}
            >
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
              className={cn(
                shellStyles.cluster,
                fastForward && "fast-forward-flash",
              )}
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
                {roomStatusClockLabel(
                  day,
                  weekdayLabel,
                  clockLabel,
                  phaseLabel,
                )}
              </span>
            </span>
          </div>
          <div className="">
            <span className={shellStyles.shop}>
              <StoreButton onOpen={() => setStoreOpen(true)} />
            </span>
          </div>
        </PanelCard>
      </div>
      <div
        className="p-[2px] flex justify-center  lg:hidden!  items-center  chamfer-frame-f2 mt-6 my-4!"
        style={{ ...chamferClipStyle(8) }}
      >
        <PanelCard
          className={cn(
            shellStyles.statusBar,
            "font-galmuri-7 text-galmuri-small flex gap-6   mb-0",
          )}
          style={{
            ...roomStatusBarVars(),
            ...statFxVars(),
            ...chamferClipStyle(8),
          }}
          data-testid="room-status-bar"
        >
          <span
            className={shellStyles.cluster}
            style={{ position: "relative" }}
          >
            <PixelIcon name="savings" size={ROOM_STATUS_BAR.iconPx} alt="" />
            <span
              data-testid="hud-money"
              style={{
                color:
                  shownMoney > 0 ? "var(--accent-mint)" : "var(--accent-coral)",
              }}
            >
              {formatVnd(shownMoney)}
            </span>
            <StatFlash statKey="money" />
            <StatFloaters statKey="money" />
          </span>
          <span
            className={cn(
              shellStyles.cluster,
              fastForward && "fast-forward-flash",
            )}
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
        </PanelCard>
      </div>
    </div>
  );
}

export function PlayerHudCard({
  iconFiles = [],
}: {
  iconFiles?: readonly string[];
}) {
  const health = useGameStore((s) => s.career.players.health);
  const mood = useGameStore((s) => s.career.players.mood);
  const energy = useGameStore((s) => s.career.players.energy);
  const sleep = useGameStore((s) => s.sleep);
  const canSleep = useGameStore((s) => canSleepAt(s.totalMinutes));
  const openCareerPanel = useGameStore((s) => s.openCareerPanel);

  const energyMax = SIM_CATALOG.config.energy_max;

  return (
    <PanelCard
      className="w-full  p-3"
      style={{
        ...statFxVars(),
        boxShadow: "none",
        border: "none",
        backgroundColor: "transparent",
      }}
    >
      <div className="grid grid-cols-3 gap-2">
        <HudVital
          icon="health"
          label="Sức khỏe"
          value={health}
          max={VITAL_MAX}
          tone="coral"
          testId="hud-health"
          alert={health < 30}
          statKey="health"
        />
        <HudVital
          icon="mood"
          label="Tinh thần"
          value={mood}
          max={VITAL_MAX}
          tone="mint"
          testId="hud-mood"
          alert={mood < 15}
          statKey="mood"
        />
        <HudVital
          icon="energy"
          label="Năng lượng"
          value={energy}
          max={energyMax}
          tone="sky"
          testId="hud-energy"
          alert={energy < 15}
          statKey="energy"
        />
      </div>
      <div className="mt-3 flex items-center">
        <div
          className="inline-flex max-w-full flex-wrap items-center justify-end"
          data-testid="hud-icon-bar"
          style={{ marginLeft: "auto", gap: HUD_ICON_GAP_PX }}
        >
          {CAREER_ACTIONS.map((action) => (
            <CareerIconButton
              key={action.id}
              action={action}
              iconFiles={iconFiles}
              onClick={() => openCareerPanel(action.id)}
            />
          ))}
          <HungerDock />
          <GameButton />
          <SleepButton canSleep={canSleep} onSleep={sleep} />
        </div>
      </div>
      <AudioControls iconFiles={iconFiles} />
    </PanelCard>
  );
}

function HudVital({
  icon,
  label,
  value,
  max,
  tone,
  testId,
  alert = false,
  statKey,
}: {
  icon: string;
  label: string;
  value: number;
  max: number;
  tone: "coral" | "mint" | "sky";
  testId: string;
  alert?: boolean;
  statKey: "health" | "mood" | "energy";
}) {
  const tweened = useTweenedNumber(value, 500);
  const shown = Math.round(value);
  const tweenedShown = Math.round(tweened);
  return (
    <div
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
      <div className="hud-vital-head mb-1">
        <PixelIcon name={icon} size={22} alt="" />
        <span className="flex min-w-0 flex-col font-galmuri-7 text-galmuri-small leading-tight">
          <span className="whitespace-nowrap text-[var(--muted-foreground)]">
            {label}
          </span>
          <span className="whitespace-nowrap text-[var(--foreground)]">
            {tweenedShown}/{max}
          </span>
        </span>
      </div>
      <StatBar value={tweened} max={max} tone={tone} instant />
    </div>
  );
}

function CareerIconButton({
  action,
  iconFiles,
  onClick,
}: {
  action: (typeof CAREER_ACTIONS)[number];
  iconFiles: readonly string[];
  onClick: () => void;
}) {
  const metrics = { buttonPx: 80, iconPx: 32 }; // Match other icon buttons

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <PixelButton
            type="button"
            variant="icon"
            data-testid={action.testId}
            data-icon-key={action.icon}
            onClick={onClick}
            aria-label={action.label}
            style={{
              width: metrics.buttonPx,
              height: metrics.buttonPx,
              minWidth: metrics.buttonPx,
              minHeight: metrics.buttonPx,
            }}
          >
            <PixelIcon
              name={action.icon}
              size={metrics.iconPx}
              alt=""
              files={iconFiles}
            />
          </PixelButton>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{action.label}</TooltipContent>
    </Tooltip>
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
