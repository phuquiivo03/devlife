"use client";

import type React from "react";
import { PixelButton } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PixelIcon } from "./PixelIcon";
import { isHungerNotice } from "./hunger-notice";
import { storeButtonMetrics } from "./store-button.config";
import { useGameStore } from "@/game/state/store";
import styles from "./notifications.module.css";

/**
 * Bell icon button for notifications. Shows a badge count for unread notices.
 * `compact` renders the 48px round face used on the top bar.
 */
export function NotificationsButton({
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
  const label = "Thông báo";
  const notices = useGameStore((s) => s.career.feed?.notices ?? []);
  // Same filter as the panel list: hidden No bụng reminders must not count,
  // or the badge claims messages the opened panel never shows.
  const unreadCount = notices.filter((n) => !n.read && !isHungerNotice(n)).length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex relative">
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
            data-testid="open-notifications"
          >
            <PixelIcon
              name="notification"
              size={iconPx}
              alt=""
              files={iconFiles}
            />
          </PixelButton>
          {unreadCount > 0 && (
            <span
              className={styles.buttonBadge}
              data-testid="notification-badge-count"
              data-count={unreadCount}
            >
              <span className="font-galmuri-7 text-[10px] leading-none text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" data-testid="notifications-tooltip">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
