"use client";

import { PixelButton } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PixelIcon } from "./PixelIcon";
import { storeButtonMetrics } from "./store-button.config";
import { useGameStore } from "@/game/state/store";
import styles from "./notifications.module.css";

/**
 * Bell icon button for notifications. Shows a badge count for unread notices.
 */
export function NotificationsButton({
  iconFiles = [],
  onOpen,
}: {
  iconFiles?: readonly string[];
  onOpen: () => void;
}) {
  const metrics = storeButtonMetrics();
  const label = "Thông báo";
  const notices = useGameStore((s) => s.career.feed?.notices ?? []);
  const unreadCount = notices.filter((n) => !n.read).length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex relative">
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
            data-testid="open-notifications"
          >
            <PixelIcon
              name="notification"
              size={metrics.iconPx}
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
