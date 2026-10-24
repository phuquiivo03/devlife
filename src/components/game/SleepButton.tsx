"use client";

import { PixelButton } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PixelIcon } from "./PixelIcon";
import {
  SLEEP_LABEL,
  sleepButtonMetrics,
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
                ? { width: "100%", height: "100%", minHeight: 40 }
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
            <PixelIcon
              name="sleep"
              size={iconPx}
              alt=""
              className={styles.icon}
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
