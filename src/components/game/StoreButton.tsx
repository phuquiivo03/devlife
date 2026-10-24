"use client";

import type React from "react";
import { PixelButton } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PixelIcon } from "./PixelIcon";
import { STORE_LABEL, storeButtonMetrics } from "./store-button.config";

/**
 * Shop control. Icon-only by default; `wide` renders the amber
 * "Cửa hàng" bar at the bottom of the actions card. The words
 * "Cửa hàng" stay the shared tooltip and the `aria-label`.
 */
export function StoreButton({
  onOpen,
  wide = false,
  clay = false,
}: {
  onOpen: () => void;
  wide?: boolean;
  clay?: boolean;
}) {
  const metrics = storeButtonMetrics();
  const iconPx = wide ? 24 : metrics.iconPx;

  const button = (
    <PixelButton
      variant="icon"
      aria-label={STORE_LABEL}
      className={cn(wide ? "justify-center" : "shrink-0")}
      style={
        wide
          ? clay
            ? ({
                width: "100%",
                minHeight: 48,
                "--btn-skin-bg": "var(--btn-store)",
                "--btn-skin-border": "transparent",
                "--btn-ink": "var(--clay-text)",
                "--btn-edge": "transparent",
              } as React.CSSProperties)
            : ({
                width: "100%",
                minHeight: 52,
                "--btn-skin-bg": "var(--accent-amber)",
                "--btn-skin-border": "var(--store-amber-border)",
                "--btn-ink": "#ffffff",
                "--btn-edge": "rgba(120, 74, 6, 0.35)",
              } as React.CSSProperties)
          : {
              width: metrics.buttonPx,
              height: metrics.buttonPx,
              minWidth: metrics.buttonPx,
              minHeight: metrics.buttonPx,
            }
      }
      onClick={onOpen}
      data-testid="open-store"
    >
      <span data-icon-key="icon_store" className="inline-flex">
        <PixelIcon
          name="store"
          size={iconPx}
          alt=""
          className="block"
        />
      </span>
      {wide ? (
        <span className="font-galmuri-9 text-galmuri-body">{STORE_LABEL}</span>
      ) : null}
    </PixelButton>
  );

  if (wide) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="top" data-testid="store-tooltip">
        {STORE_LABEL}
      </TooltipContent>
    </Tooltip>
  );
}
