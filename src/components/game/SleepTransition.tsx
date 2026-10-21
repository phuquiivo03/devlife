"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore, setClockSkip } from "@/game/state/store";
import { advanceMinutes, sleepToNextMorning, timeBus } from "@/game/time";

const SLEEP_DURATION_MS = 10000; // 10 seconds real time
const FADE_OUT_MS = 2000; // 2 seconds fade to black
const FADE_IN_MS = 2000; // 2 seconds fade from black
const FRAME_INTERVAL_MS = 16; // ~60fps

/**
 * Sleep transition overlay that:
 * 1. Fades screen to black over 2 seconds
 * 2. Fast-forwards time from current to wake time over 10 seconds (progresses clock continuously)
 * 3. Fades screen back in over 2 seconds
 */
export function SleepTransition() {
  const sleepTransition = useGameStore((s) => s.sleepTransition);
  const [opacity, setOpacity] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastMinutesRef = useRef<number>(0);

  useEffect(() => {
    console.log('[SLEEP_TRANSITION] Effect triggered, sleepTransition:', sleepTransition);

    if (!sleepTransition?.active) {
      setOpacity(0);
      setClockSkip(false);
      return;
    }

    console.log('[SLEEP_TRANSITION] Starting sleep animation');

    // Set clockSkip to true to prevent event handlers during sleep
    setClockSkip(true);

    const { startTime, fromMinutes, toMinutes } = sleepTransition;
    const totalMinutesChange = toMinutes - fromMinutes;
    startTimeRef.current = startTime;
    lastMinutesRef.current = fromMinutes;

    console.log('[SLEEP_TRANSITION] Animation params:', {
      fromMinutes,
      toMinutes,
      totalMinutesChange,
      startTime
    });

    let frameCount = 0;

    const animate = () => {
      frameCount++;
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / SLEEP_DURATION_MS);

      if (frameCount % 30 === 0) {
        console.log('[SLEEP_TRANSITION] Animate frame:', { frameCount, elapsed, progress });
      }

      // Calculate opacity based on phase
      let currentOpacity = 0;
      if (elapsed < FADE_OUT_MS) {
        // Fade out phase: 0 → 1
        currentOpacity = elapsed / FADE_OUT_MS;
      } else if (elapsed < SLEEP_DURATION_MS - FADE_IN_MS) {
        // Full black phase
        currentOpacity = 1;
      } else {
        // Fade in phase: 1 → 0
        const fadeInProgress = (elapsed - (SLEEP_DURATION_MS - FADE_IN_MS)) / FADE_IN_MS;
        currentOpacity = 1 - fadeInProgress;
      }

      setOpacity(currentOpacity);

      // Update time progressively during sleep
      const targetMinutes = fromMinutes + totalMinutesChange * progress;
      const deltaMinutes = targetMinutes - lastMinutesRef.current;

      if (deltaMinutes >= 1) {
        const result = advanceMinutes(lastMinutesRef.current, Math.floor(deltaMinutes));
        // Update the clock display
        useGameStore.setState({ totalMinutes: result.totalMinutes });

        // Emit time events (they will be ignored by event handlers due to clockSkip)
        for (const event of result.events) {
          timeBus.emit(event);
        }

        lastMinutesRef.current = result.totalMinutes;
      }

      if (progress >= 1) {
        // Transition complete - reset clockSkip and fire sleep event
        console.log('[SLEEP_TRANSITION] Animation complete, cleaning up');

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        setClockSkip(false);

        const result = sleepToNextMorning(fromMinutes);
        useGameStore.setState({
          totalMinutes: result.totalMinutes,
          sleepTransition: null,
        });

        console.log('[SLEEP_TRANSITION] Firing sleep events');
        // Fire sleep event which will trigger wake-up logic
        for (const event of result.events) {
          timeBus.emit(event);
        }
      }
    };

    console.log('[SLEEP_TRANSITION] Starting interval');
    intervalRef.current = setInterval(animate, FRAME_INTERVAL_MS);

    return () => {
      console.log('[SLEEP_TRANSITION] Cleanup - clearing interval');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setClockSkip(false);
    };
  }, [sleepTransition]);

  if (!sleepTransition?.active) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 bg-black"
      style={{
        opacity,
        willChange: "opacity",
      }}
      aria-hidden="true"
    />
  );
}
