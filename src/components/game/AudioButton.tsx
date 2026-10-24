"use client";

import type React from "react";
import { PixelButton } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PixelIcon } from "./PixelIcon";
import { storeButtonMetrics } from "./store-button.config";

/**
 * Icon-only audio control button. Opens the audio settings popup.
 * `compact` renders the 48px round face used on the top bar.
 */
export function AudioButton({
  iconFiles = [],
  compact = false,
  onOpen,
}: {
  iconFiles?: readonly string[];
  compact?: boolean;
  onOpen: () => void;
}) {
  const metrics = storeButtonMetrics();
  const buttonPx = compact ? 48 : metrics.buttonPx;
  const iconPx = compact ? 24 : metrics.iconPx;
  const label = "Âm thanh";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <PixelButton
            variant="icon"
            aria-label={label}
            className="shrink-0"
            style={{
              width: buttonPx,
              height: buttonPx,
              minWidth: buttonPx,
              minHeight: buttonPx,
              ...(compact ? ({ "--btn-radius": "999px" } as React.CSSProperties) : {}),
            }}
            onClick={onOpen}
            data-testid="open-audio"
          >
            <PixelIcon
              name="sound_on"
              size={iconPx}
              alt=""
              files={iconFiles}
            />
          </PixelButton>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" data-testid="audio-tooltip">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
