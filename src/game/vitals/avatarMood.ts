/**
 * Derived HUD portrait. Not persisted: the face is recomputed from the
 * live player vitals whenever those numbers change.
 *
 * Stats (all 0–100, higher is better):
 * - `health` — Sức khỏe
 * - `fullness` — No bụng. The bar drains toward 0; below the threshold the player is hungry.
 * - `mood` — Tinh thần
 */

/** A vital strictly below this counts as low. The value 30 itself is fine. */
export const AVATAR_MOOD_THRESHOLD = 30;

export type AvatarMood = "sick" | "hungry" | "stress" | "normal";

export type AvatarMoodStats = {
  health: number;
  fullness: number;
  mood: number;
};

/**
 * Sick has no portrait of its own yet. This file, next to the other mood
 * portraits in `public/avatars/mood/`, stands in until dedicated sick art
 * replaces it.
 */
export const SICK_MOOD_AVATAR_FILE = "tired.png";

export const MOOD_AVATAR_DIR = "/avatars/mood";

export const MOOD_AVATAR_FILE: Record<AvatarMood, string> = {
  normal: "normal.png",
  hungry: "hungry.png",
  stress: "stress.png",
  sick: SICK_MOOD_AVATAR_FILE,
};

function isLow(value: number): boolean {
  return value < AVATAR_MOOD_THRESHOLD;
}

/**
 * Portrait mood. Priority when several vitals are low: sick, then hungry, then stress.
 * Everything at or above the threshold is normal.
 */
export function getAvatarMood(stats: AvatarMoodStats): AvatarMood {
  if (isLow(stats.health)) return "sick";
  if (isLow(stats.fullness)) return "hungry";
  if (isLow(stats.mood)) return "stress";
  return "normal";
}

export function avatarMoodSrc(mood: AvatarMood): string {
  return `${MOOD_AVATAR_DIR}/${MOOD_AVATAR_FILE[mood]}`;
}
