"use client";

import { PixelButton } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { m51AssetPath } from "@/game/life/assets";
import {
  SLEEP_LABEL,
  sleepButtonMetrics,
  sleepIconFile,
  sleepZzzStyle,
} from "./sleep-button.config";
import styles from "./sleep-button.module.css";

/**
 * Icon-only sleep control. The words "Đi ngủ" are the shared tooltip.
 * The button keeps that name as its `aria-label`. The wrapper is the
 * trigger so the tip still opens when the control is disabled.
 */
export function SleepButton({
  canSleep,
  onSleep,
  clay = false,
}: {
  canSleep: boolean;
  onSleep: () => void;
  clay?: boolean;
}) {
  const metrics = sleepButtonMetrics();
  const iconPx = clay ? 24 : metrics.iconPx;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex w-full">
          <PixelButton
            variant="icon"
            disabled={!canSleep}
            aria-label={SLEEP_LABEL}
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
            onClick={onSleep}
            data-testid="sleep-button"
            data-sleep-ready={canSleep ? "1" : "0"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- pixel bed stays unoptimized */}
            <img
              src={m51AssetPath(sleepIconFile())}
              alt=""
              width={iconPx}
              height={iconPx}
              draggable={false}
              data-icon-key="icon_btn_sleep"
              className={styles.icon}
              style={{ width: iconPx, height: iconPx }}
            />
            {canSleep ? (
              <span
                className={styles.zzz}
                aria-hidden="true"
                data-testid="sleep-zzz"
                style={sleepZzzStyle()}
              />
            ) : null}
          </PixelButton>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" data-testid="sleep-tooltip">
        {SLEEP_LABEL}
      </TooltipContent>
    </Tooltip>
  );
}
