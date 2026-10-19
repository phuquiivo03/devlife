"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useStatFxStore } from "./stat-fx-store";
import { type StatKey } from "./stat-fx";
import styles from "./stat-fx.module.css";

export function StatFloaters({
  statKey,
  className,
}: {
  statKey: StatKey;
  className?: string;
}) {
  const floaters = useStatFxStore((s) => s.floaters);
  const expire = useStatFxStore((s) => s.expire);

  const items = useMemo(
    () => floaters.filter((f) => f.key === statKey),
    [floaters, statKey]
  );

  if (items.length === 0) return null;

  return (
    <div className={cn(styles.layer, className)} aria-hidden="true">
      {items.map((f, idx) => (
        <span
          key={f.id}
          className={cn(
            styles.pill,
            statKey === "money" && styles.anchorStart,
            styles[f.tone],
            f.big && styles.big,
            f.big ? "font-galmuri-9 text-galmuri-body" : "font-galmuri-7 text-galmuri-small"
          )}
          style={{ animationDelay: `${f.delayMs}ms`, bottom: `${idx * 18}px` }}
          data-testid="stat-floater"
          data-stat={f.key}
          data-tone={f.tone}
          data-big={f.big ? "1" : "0"}
          onAnimationEnd={() => expire(f.id)}
        >
          {f.text}
        </span>
      ))}
    </div>
  );
}

export function StatFlash({ statKey }: { statKey: StatKey }) {
  const flash = useStatFxStore((s) => s.flashes[statKey]);
  const clearFlash = useStatFxStore((s) => s.clearFlash);

  if (!flash) return null;

  return (
    <span
      key={flash.id}
      className={cn(styles.flash, flash.tone === "gain" ? styles.flashGain : styles.flashLoss)}
      aria-hidden="true"
      onAnimationEnd={() => clearFlash(statKey, flash.id)}
    />
  );
}
