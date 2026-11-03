"use client";

import { useEffect, useRef, useState } from "react";
import { PixelButton } from "@/components/ui/button";
import {
  INTRO_SUBTITLE,
  INTRO_SUBTITLE_FROM_SECONDS,
  INTRO_SUBTITLE_TO_SECONDS,
  INTRO_VIDEO_SRC,
} from "@/content/intro";
import { useGameStore } from "@/game/state/store";

const FADE_MS = 520;

/**
 * Fullscreen dream that plays once, after the player names the character
 * and before the room is theirs. The clock stays paused until it ends.
 */
export function IntroVideo() {
  const introSeen = useGameStore((s) => s.career.players.introSeen);
  const introVideoSeen = useGameStore((s) => s.career.players.introVideoSeen);
  const setClockPaused = useGameStore((s) => s.setClockPaused);
  const finishIntroVideo = useGameStore((s) => s.finishIntroVideo);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showLine, setShowLine] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (introVideoSeen) return;
    setClockPaused(true);
  }, [introVideoSeen, setClockPaused]);

  useEffect(() => {
    if (!introSeen || introVideoSeen) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const pending = video.play();
    if (pending) pending.catch(() => undefined);
  }, [introSeen, introVideoSeen]);

  useEffect(() => {
    if (!leaving) return;
    // Land on 07:00 while the overlay still covers the room, and stay paused
    // so the fade does not tick the clock. Resume as the overlay leaves.
    finishIntroVideo();
    setClockPaused(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveal = () => {
      setClockPaused(false);
      setGone(true);
    };
    if (reduce) {
      reveal();
      return;
    }
    const id = window.setTimeout(reveal, FADE_MS);
    return () => window.clearTimeout(id);
  }, [leaving, finishIntroVideo, setClockPaused]);

  if (gone || !introSeen || (introVideoSeen && !leaving)) return null;

  const close = () => setLeaving(true);

  return (
    <div
      className={`fixed inset-0 z-[70] bg-black transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      data-testid="intro-video"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain"
        src={INTRO_VIDEO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onTimeUpdate={(event) => {
          const t = event.currentTarget.currentTime;
          const next = t >= INTRO_SUBTITLE_FROM_SECONDS && t < INTRO_SUBTITLE_TO_SECONDS;
          setShowLine((current) => (current === next ? current : next));
        }}
        onEnded={close}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 px-4 pt-16"
        style={{
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
          background: showLine
            ? "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))"
            : undefined,
        }}
      >
        {showLine ? (
          <p
            className="text-center font-galmuri-9 text-galmuri-body text-white"
            style={{ textShadow: "0 2px 0 rgba(0,0,0,0.85)" }}
            data-testid="intro-subtitle"
          >
            {INTRO_SUBTITLE}
          </p>
        ) : null}
        <div className="flex justify-end">
          <PixelButton
            type="button"
            variant="primary"
            className="pointer-events-auto"
            data-testid="intro-skip"
            onClick={close}
          >
            Bỏ qua
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
