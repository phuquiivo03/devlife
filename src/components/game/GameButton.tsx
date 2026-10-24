"use client";

import { PixelButton } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGameStore } from "@/game/state/store";
import { snapshot } from "@/game/time";
import { LIFE } from "@/game/life/content";
import { energyCost, gameBlocked, gameMoodGain } from "@/game/life/logic";
import { PixelIcon } from "./PixelIcon";
import {
  GAME_LABEL,
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
                ? { width: "100%", height: "100%", minHeight: 40 }
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
            <PixelIcon
              name="game"
              size={clay ? 24 : metrics.iconPx}
              alt=""
              className={styles.icon}
            />
          </PixelButton>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" data-testid="game-tooltip">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
