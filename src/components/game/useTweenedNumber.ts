"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/reduced-motion";
import { tweenValue } from "./stat-fx";

export function useTweenedNumber(target: number, durationMs: number): number {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  const targetRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  targetRef.current = target;

  useEffect(() => {
    if (reduced) {
      setShown(target);
      return;
    }

    if (durationMs <= 0) {
      setShown(target);
      fromRef.current = target;
      return;
    }

    const from = shown;
    fromRef.current = from;
    startRef.current = performance.now();

    const tick = (now: number) => {
      const start = startRef.current ?? now;
      const elapsed = now - start;
      const val = tweenValue(from, targetRef.current, elapsed, durationMs);
      setShown(val);
      if (elapsed < durationMs) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setShown(targetRef.current);
      }
    };

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, durationMs, reduced]);

  return shown;
}
