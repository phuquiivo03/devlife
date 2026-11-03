import { LIFE } from "./content";

/**
 * Fall clip on `/models/characters/player_anim.glb`.
 * Keyframes run from 1/24s through 73/24s. The siren and hospital popup wait
 * for the whole clip, then a short screen dim.
 */
export const FALL_CLIP_SECONDS = 73 / 24;
export const FAINT_FADE_MS = 500;
export const FAINT_BEFORE_SIREN_MS = Math.round(FALL_CLIP_SECONDS * 1000) + FAINT_FADE_MS;
/** Peak opacity of the dim that plays after the body hits the floor. */
export const FAINT_DIM = 0.72;

export type FaintState = {
  /** Wall-clock start. The delay is measured from here, not from the 3D scene. */
  startedAt: number;
  /** The fall and dim finished; the hospital popup is up and the pose stays fallen. */
  admitted: boolean;
};

/** True while the fall is playing and the hospital popup is not up yet. */
export function faintBlocksInput(faint: FaintState | null | undefined): boolean {
  return faint != null && !faint.admitted;
}

/** Milliseconds left before the siren. Zero once the clip and the dim are done. */
export function faintDelayRemaining(startedAt: number, now: number): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return FAINT_BEFORE_SIREN_MS;
  return Math.max(0, FAINT_BEFORE_SIREN_MS - (now - startedAt));
}

/**
 * Overlay opacity for the dim. It stays clear during the fall, then rises
 * over `FAINT_FADE_MS`. Reduced motion snaps to the peak once the fade starts.
 */
export function faintDimOpacity(startedAt: number, now: number, reduceMotion: boolean): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0;
  const elapsed = now - startedAt;
  const fadeStart = FAINT_BEFORE_SIREN_MS - FAINT_FADE_MS;
  if (elapsed < fadeStart) return 0;
  if (reduceMotion || elapsed >= FAINT_BEFORE_SIREN_MS) return FAINT_DIM;
  return FAINT_DIM * ((elapsed - fadeStart) / FAINT_FADE_MS);
}

/**
 * A reload drops the in-memory faint. Health still below the hospital line
 * means the collapse already happened, so the popup should open immediately
 * instead of leaving the player locked or stuck at empty health.
 */
export function collapsedOnReload(health: number | null | undefined): boolean {
  return typeof health === "number" && Number.isFinite(health) && health < LIFE.hospital_below;
}
