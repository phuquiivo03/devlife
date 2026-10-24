import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { PixelIcon } from "./PixelIcon";

const barTone: Record<string, string> = {
  coral: "bg-[var(--accent-coral)]",
  mint: "bg-[var(--accent-mint)]",
  sky: "bg-[var(--accent-sky)]",
  amber: "bg-[var(--accent-amber)]",
  exp: "bg-[var(--accent-mint)]",
};

type Props = {
  value: number;
  max?: number;
  tone: keyof typeof barTone;
  className?: string;
  stepped?: boolean;
  /**
   * Clay variant (`.clay-stat-*` in globals.css): a thick pill track with
   * the icon + label inside left and the current value inside right. Height
   * follows `--clay-stat-h` (30px by default).
   */
  variant?: "default" | "clay";
  icon?: string;
  label?: string;
  alert?: boolean;
  showValue?: boolean;
  style?: CSSProperties;
};

export function StatBar({
  value,
  max = 100,
  tone,
  className,
  stepped = false,
  instant = false,
  variant = "default",
  icon,
  label,
  alert = false,
  showValue = true,
  style,
}: Props & { instant?: boolean }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));

  if (variant === "clay") {
    return (
      <div className={cn("clay-stat-row", className)} style={style}>
        <div className="clay-stat-track" data-tone={tone}>
          <div
            className="clay-stat-fill"
            data-alert={alert ? "1" : undefined}
            style={{
              width: `${pct}%`,
              ...(instant ? { transition: "none" } : null),
            }}
          />
          {label ? (
            <span className="clay-stat-label">
              {icon ? <PixelIcon name={icon} size={18} alt="" /> : null}
              {label}
            </span>
          ) : null}
          {showValue ? (
            <span className="clay-stat-value">
              {Math.round(value)}
              {alert ? <span className="clay-stat-dot" aria-hidden="true" /> : null}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("stat-track", className)}>
      <div
        className={cn("stat-fill h-full", stepped ? "xp-fill" : instant ? "" : "transition-[width] duration-300", barTone[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
