/** Display name chosen on the creation popup. Code points, so one emoji counts as one. */
export const PLAYER_NAME_MAX = 20;

/** Name written onto saves that already started before names existed. */
export const MIGRATED_PLAYER_NAME = "Quí";

/** Trimmed display name, capped. Empty when the player has not chosen one. */
export function normalizePlayerName(value: unknown): string {
  if (typeof value !== "string") return "";
  const collapsed = value.trim().replace(/\s+/g, " ");
  return Array.from(collapsed).slice(0, PLAYER_NAME_MAX).join("");
}
