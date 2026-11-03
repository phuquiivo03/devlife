"use client";

import { useEffect, useState } from "react";
import { PixelAvatar } from "@/components/game/PixelAvatar";
import { PixelButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelCard } from "@/components/ui/panel-card";
import { TRAIT_IDS } from "@/game/career/types";
import { useGameStore } from "@/game/state/store";
import {
  INTRO_FLASH_MS,
  INTRO_SPIN_MS,
  introIndex,
  traitDef,
  traitDetail,
  traitIconSrc,
  traitOf,
} from "@/game/life/traits";
import { formatVnd } from "@/lib/format-currency";

export function CharacterIntro() {
  const introSeen = useGameStore((s) => s.career.players.introSeen);
  const traitId = useGameStore((s) => traitOf(s.career));
  const money = useGameStore((s) => s.career.players.money);
  const energy = useGameStore((s) => s.career.players.energy);
  const health = useGameStore((s) => s.career.players.health);
  const mood = useGameStore((s) => s.career.players.mood);
  const dismissIntro = useGameStore((s) => s.dismissIntro);
  const target = Math.max(0, TRAIT_IDS.indexOf(traitId));
  const [frame, setFrame] = useState(() => introIndex(0, INTRO_SPIN_MS, target));
  const [name, setName] = useState("");

  const confirmIntro = () => dismissIntro(name);

  useEffect(() => {
    if (introSeen) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setFrame(introIndex(INTRO_SPIN_MS, INTRO_SPIN_MS, target));
      return;
    }
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const next = introIndex(now - started, INTRO_SPIN_MS, target);
      setFrame((current) =>
        current.index === next.index && current.stopped === next.stopped ? current : next,
      );
      if (!next.stopped) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [introSeen, target]);

  if (introSeen) return null;

  const shownId = frame.stopped ? traitId : (TRAIT_IDS[frame.index] ?? traitId);
  const shown = traitDef(shownId);
  const landed = traitDef(traitId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,37,72,0.45)] p-4"
      data-testid="character-intro"
      data-stopped={frame.stopped ? "1" : "0"}
      data-trait={traitId}
    >
      <PanelCard className="w-full max-w-sm p-4 text-center">
        <p className="font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
          Bạn đã hóa thân vào nhân vật:
        </p>
        <div className="mt-3 flex justify-center">
          <span
            className={frame.stopped ? "intro-flash inline-flex bg-transparent p-1" : "inline-flex p-1"}
            style={frame.stopped ? { animationDuration: `${INTRO_FLASH_MS}ms` } : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- trait icons stay pixelated */}
            <img
              src={traitIconSrc(shown.icon)}
              width={64}
              height={64}
              alt=""
              className="pixel-img h-16 w-16"
              data-testid="character-intro-icon"
              data-icon={shown.id}
            />
          </span>
        </div>
        {frame.stopped ? (
          <div className="mt-3" data-testid="character-intro-result">
            <div className="mb-2 flex justify-center">
              <PixelAvatar role="player" size={96} alt="" />
            </div>
            <p className="font-galmuri-11 text-galmuri-title text-[var(--foreground)]">{landed.name}</p>
            <p className="mt-1 font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
              {traitDetail(landed)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-left font-galmuri-7 text-galmuri-small text-[var(--foreground)]">
              <p>Sức khỏe: {Math.round(health)}</p>
              <p>Tinh thần: {Math.round(mood)}</p>
              <p>Năng lượng: {Math.round(energy)}</p>
              <p data-testid="character-intro-money">Tiền: {formatVnd(money)}</p>
            </div>
            <Input
              data-testid="character-intro-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") confirmIntro();
              }}
              placeholder="Đặt tên cho nhân vật..."
              maxLength={24}
              autoFocus
              className="mt-4 h-10 text-center font-galmuri-9 text-galmuri-body"
            />
            <PixelButton
              variant="primary"
              className="mt-2 w-full"
              data-testid="character-intro-start"
              onClick={confirmIntro}
            >
              Bắt đầu
            </PixelButton>
          </div>
        ) : null}
      </PanelCard>
    </div>
  );
}
