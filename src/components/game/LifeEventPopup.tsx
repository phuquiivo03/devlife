"use client";

/* eslint-disable @next/next/no-img-element -- native pixel art stays unoptimized */

import { lifeEventById } from "@/game/life/events-content";
import { m5AssetPath, type M5AssetKey } from "@/game/life/assets";
import { useGameStore } from "@/game/state/store";
import { PixelButton } from "@/components/ui/button";
import { lifeEventPopupStyle } from "./life-event-popup.config";
import styles from "./life-event-popup.module.css";

function art(key: string): string {
  return m5AssetPath(key as M5AssetKey);
}

/**
 * Pending life event. Mounted on the room canvas.
 * Copy, portraits, and choices stay as the event defines them.
 */
export function LifeEventPopup() {
  const pendingId = useGameStore((s) => s.career.feed?.pendingId ?? null);
  const chooseLife = useGameStore((s) => s.chooseLife);
  const event = pendingId ? lifeEventById(pendingId) : null;
  if (!event) return null;

  return (
    <div className={styles.host} style={lifeEventPopupStyle()} data-testid="life-dialog">
      <div className={styles.card}>
        {event.portrait ? (
          <img
            src={art(event.portrait)}
            width={96}
            height={96}
            alt=""
            className="pixel-img h-24 w-24 shrink-0"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <p className="font-galmuri-9 text-galmuri-body text-[var(--foreground)]">{event.text}</p>
          <div className="flex flex-wrap gap-2">
            {event.choices.map((choice) => (
              <PixelButton
                key={choice.id}
                type="button"
                variant="light"
                data-testid={`life-choice-${choice.id}`}
                onClick={() => chooseLife(choice.id)}
              >
                {choice.text}
              </PixelButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
