export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

import { useSyncExternalStore } from "react";

/** False on the server. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Live value; listens to the media query "change" event. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => {};
      }
      const media = window.matchMedia(REDUCED_MOTION_QUERY);
      const handler = () => onStoreChange();
      media.addEventListener?.("change", handler);
      return () => media.removeEventListener?.("change", handler);
    },
    () => prefersReducedMotion(),
    () => false,
  );
}
