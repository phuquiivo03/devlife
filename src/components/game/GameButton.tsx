"use client";

import { PixelButton } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGameStore } from "@/game/state/store";
import { snapshot } from "@/game/time";
import { LIFE } from "@/game/life/content";
import { energyCost, gameBlocked, gameMoodGain } from "@/game/life/logic";
import { m51AssetPath } from "@/game/life/assets";
import {
  GAME_LABEL,
  GAME_ICON_FALLBACK,
  GAME_ICON_KEY,
  gameButtonMetrics,
  gameButtonTip,
} from "./game-button.config";
import styles from "./game-button.module.css";

export function GameButton({ clay = false }: { clay?: boolean }) {
  const career = useGameStore((s) => s.career);
  const totalMinutes = useGameStore((s) => s.totalMinutes);
  const hospitalOpen = useGameStore((s) => s.hospitalOpen);
  const taskJobId = useGameStore((s) => s.taskJobId);
  const playGame = useGameStore((s) => s.playGame);

  const snap = snapshot(totalMinutes);
  const minuteOfDay = snap.minuteOfDay;
  const workStreak = career.life.workStreak;

  const blocked = gameBlocked(career, {
    minuteOfDay,
    hospitalOpen,
    taskOpen: taskJobId != null,
  });

  const moodGain = gameMoodGain(career);
  const energyCostVal = energyCost(LIFE.game_energy, workStreak);
  const hours = LIFE.slot_hours;
  const tip = gameButtonTip(blocked, moodGain, energyCostVal, hours);

  const metrics = gameButtonMetrics();

  // Try to load actual icon, fallback to emoji
  const iconExists = false; // TODO: check public/ui/m5_1/icon_btn_game.png existence at build time
  const iconSrc = iconExists ? m51AssetPath(`${GAME_ICON_KEY}.png`) : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex w-full">
          <PixelButton
            variant="icon"
            disabled={blocked != null}
            aria-label={GAME_LABEL}
            className={clay ? "clay-tile-inner w-full" : styles.button}
            style={
              clay
                ? { width: "100%", height: 40, minHeight: 40 }
                : {
                    width: metrics.buttonPx,
                    height: metrics.buttonPx,
                    minWidth: metrics.buttonPx,
                    minHeight: metrics.buttonPx,
                  }
            }
            onClick={playGame}
            data-testid="game-button"
            data-game-ready={blocked ? "0" : "1"}
          >
            {iconSrc ? (
              <img
                src={iconSrc}
                alt=""
                width={clay ? 24 : metrics.iconPx}
                height={clay ? 24 : metrics.iconPx}
                draggable={false}
                data-icon-key={GAME_ICON_KEY}
                className={styles.icon}
                style={{ width: clay ? 24 : metrics.iconPx, height: clay ? 24 : metrics.iconPx }}
              />
            ) : (
              <span
                className={styles.emoji}
                style={{ fontSize: (clay ? 24 : metrics.iconPx) * 0.8 }}
                aria-hidden="true"
              >
                {GAME_ICON_FALLBACK}
              </span>
            )}
          </PixelButton>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" data-testid="game-tooltip">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
