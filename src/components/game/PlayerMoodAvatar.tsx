"use client";

import { avatarMoodSrc, getAvatarMood } from "@/game/vitals/avatarMood";
import { useGameStore } from "@/game/state/store";
import { cn } from "@/lib/utils";

type Props = {
  size: number;
  alt?: string;
  className?: string;
};

/**
 * The mood sheets are 512px busts. Zoom toward the face so a 56px HUD
 * circle still shows the expression. Focal point is a fraction of the sheet.
 */
const FACE_ZOOM = 1.55;
const FACE_FOCUS_X = 0.5;
const FACE_FOCUS_Y = 0.66;

/**
 * HUD player portrait. Subscribes to Sức khỏe, No bụng, and Tinh thần so the
 * face follows those stats as they cross the mood threshold.
 */
export function PlayerMoodAvatar({ size, alt = "", className }: Props) {
  const mood = useGameStore((s) =>
    getAvatarMood({
      health: s.career.players.health,
      fullness: s.career.players.fullness,
      mood: s.career.players.mood,
    }),
  );
  const display = Math.round(size * FACE_ZOOM);
  const left = Math.round(size / 2 - FACE_FOCUS_X * display);
  const top = Math.round(size / 2 - FACE_FOCUS_Y * display);

  return (
    <span
      className="relative inline-block shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- clay mood portraits stay unoptimized */}
      <img
        src={avatarMoodSrc(mood)}
        alt={alt}
        width={display}
        height={display}
        data-testid="player-mood-avatar"
        data-avatar-mood={mood}
        draggable={false}
        className={cn("absolute max-w-none", className)}
        style={{ width: display, height: display, left, top }}
      />
    </span>
  );
}
