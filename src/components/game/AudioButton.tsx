"use client";

import { PixelButton } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PixelIcon } from "./PixelIcon";
import { storeButtonMetrics } from "./store-button.config";

/**
 * Icon-only audio control button. Opens the audio settings popup.
 */
export function AudioButton({
  iconFiles = [],
  onOpen,
}: {
  iconFiles?: readonly string[];
  onOpen: () => void;
}) {
  const metrics = storeButtonMetrics();
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
              width: metrics.buttonPx,
              height: metrics.buttonPx,
              minWidth: metrics.buttonPx,
              minHeight: metrics.buttonPx,
            }}
            onClick={onOpen}
            data-testid="open-audio"
          >
            <PixelIcon
              name="sound_on"
              size={metrics.iconPx}
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
