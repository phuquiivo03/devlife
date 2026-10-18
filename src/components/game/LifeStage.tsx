"use client";

/* eslint-disable @next/next/no-img-element -- native pixel art stays unoptimized */

import { useEffect, useState } from "react";
import { LIFE_EVENTS } from "@/game/life/events-content";
import { diaryWhen } from "@/game/life/events";
import { m5AssetPath, m51AssetPath, type M5AssetKey } from "@/game/life/assets";
import {
  CONFETTI_PIECES,
  bannerArtFile,
  bannerMetrics,
  bannerPlateStyle,
  confettiFieldStyle,
  notepadFrameStyle,
} from "@/game/life/m51-art";
import type { LifeDiary } from "@/game/career/types";
import { useGameStore } from "@/game/state/store";
import { formatVnd } from "@/lib/format-currency";

function art(key: string): string {
  return m5AssetPath(key as M5AssetKey);
}

export function LifeStage() {
  const diary = useGameStore((s) => s.career.feed?.diary ?? null);
  const banner = useGameStore((s) => s.lifeBanner);
  const dismissDiary = useGameStore((s) => s.dismissDiary);
  const syncLifeSurface = useGameStore((s) => s.syncLifeSurface);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    syncLifeSurface();
  }, [syncLifeSurface]);

  useEffect(() => {
    if (!banner) return;
    const delay = Math.max(0, banner.until - Date.now());
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const showBanner = banner != null && banner.until > now;
  const bannerBox = bannerMetrics();

  return (
    <>
      {showBanner ? (
        <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" data-testid="life-banner">
          <div className="life-banner-dim absolute inset-0" data-testid="life-banner-dim" />
          <div
            className="life-banner relative z-10 mx-auto mt-16 flex w-[min(1200px,calc(100%-1.5rem))] justify-center"
            style={{ animationDuration: `${LIFE_EVENTS.banner_enter_ms}ms` }}
          >
            <div className="life-banner-plate" data-testid="life-banner-plate" style={bannerPlateStyle()}>
              <img
                src={m51AssetPath(bannerArtFile())}
                width={bannerBox.widthPx}
                height={bannerBox.heightPx}
                alt=""
                className="life-banner-sparkle pixel-img"
                style={{ animationDuration: `${LIFE_EVENTS.banner_spark_ms}ms` }}
                data-testid="life-banner-art"
              />
              <p className="life-banner-label font-galmuri-11 text-galmuri-title" data-testid="life-banner-label">
                {banner.label}
              </p>
            </div>
            <div
              className="life-confetti-field"
              data-testid="life-confetti"
              data-count={CONFETTI_PIECES.length}
              style={confettiFieldStyle()}
            >
              {CONFETTI_PIECES.map((piece) => (
                <span
                  key={piece.id}
                  className="life-confetti-piece"
                  style={{
                    left: piece.left,
                    top: piece.topPx,
                    animationDelay: `${piece.delayMs}ms, ${piece.delayMs}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {diary ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-3" data-testid="life-diary">
          <div className="life-notepad w-full" style={notepadFrameStyle()}>
            <p className="life-notepad-title font-galmuri-7 text-galmuri-small" data-testid="diary-title">
              nhat_ky_ngay_{diary.day}.txt
            </p>
            <div className="life-notepad-chrome">
              <button type="button" aria-label="Thu nhỏ" data-testid="diary-min" />
              <button type="button" aria-label="Phóng to" data-testid="diary-max" />
              <button type="button" aria-label="Đóng" data-testid="life-diary-close" onClick={dismissDiary} />
            </div>
            <ul className="space-y-1 p-3 font-galmuri-7 text-galmuri-small text-[var(--foreground)]">
              <li data-testid="diary-when">{diaryWhen(diary)}</li>
              <li data-testid="diary-earned" className="text-[var(--accent-mint)]">
                Kiếm được +{formatVnd(diary.earned)}
              </li>
              <li data-testid="diary-spent" className="text-[var(--accent-coral)]">
                Đã tiêu −{formatVnd(diary.spent)}
              </li>
              <DiarySpends diary={diary} />
              <li data-testid="diary-left">Còn lại {formatVnd(diary.remaining)}</li>
              <li data-testid="diary-stats">
                XP {signed(diary.xp)} · Sức khỏe {signed(diary.health)} · Tinh thần {signed(diary.mood)} · Năng lượng{" "}
                {signed(diary.energy)}
              </li>
              <li data-testid="diary-pin">{diary.pin || "Chưa ghim món."}</li>
            </ul>
            <p className="px-3 pb-3 font-galmuri-7 text-galmuri-small text-[var(--foreground)]">{diary.line}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function signed(value: number): string {
  const shown = Math.round(value);
  return shown > 0 ? `+${shown}` : `${shown}`;
}

function DiarySpends({ diary }: { diary: LifeDiary }) {
  const parts: { id: string; text: string }[] = [];
  if (diary.food > 0) parts.push({ id: "diary-food", text: `Ăn −${formatVnd(diary.food)}` });
  if (diary.rent > 0) parts.push({ id: "diary-rent", text: `Trọ −${formatVnd(diary.rent)}` });
  if (diary.shop > 0) parts.push({ id: "diary-shop", text: `Mua đồ −${formatVnd(diary.shop)}` });
  if (parts.length === 0) return null;
  return (
    <li data-testid="diary-breakdown">
      {parts.map((part, index) => (
        <span key={part.id}>
          {index > 0 ? " · " : null}
          <span data-testid={part.id}>{part.text}</span>
        </span>
      ))}
    </li>
  );
}

export function LifeRoomFx() {
  const health = useGameStore((s) => s.career.players.health);
  const mood = useGameStore((s) => s.career.players.mood);
  const energy = useGameStore((s) => s.career.players.energy);
  const bubble = useGameStore((s) => s.lifeBubble);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!bubble) return;
    const delay = Math.max(0, bubble.until - Date.now());
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [bubble]);

  const emote =
    health < 30 ? "emote_cough.png" : mood < 15 ? "emote_cloud.png" : energy < 15 ? "emote_sweat.png" : null;
  const showBubble = bubble != null && bubble.until > now;

  return (
    <>
      {emote ? (
        <img
          src={art(emote)}
          width={32}
          height={32}
          alt=""
          className="pixel-img pointer-events-none absolute left-1/2 top-[22%] z-10"
          data-testid="life-emote"
          data-emote={emote}
        />
      ) : null}
      {showBubble ? (
        <p className="life-bubble pointer-events-none absolute left-1/2 top-[8%] z-10 max-w-[180px] px-3 py-2 font-galmuri-7 text-galmuri-small text-[var(--foreground)]" data-testid="life-bubble">
          {bubble.text}
        </p>
      ) : null}
    </>
  );
}
