"use client";

import { useEffect, useRef } from "react";
import type { LoadedAtlas } from "@/game/render/atlas";
import { cn } from "@/lib/utils";

type Props = {
  atlas: LoadedAtlas | null;
  sprite?: string;
  label: string;
  selected?: boolean;
  badge?: string;
  onClick?: () => void;
  /** 3D shop icon URL — draws an <img> instead of the pixel-atlas canvas. */
  imageUrl?: string;
};

export function ItemThumb({
  atlas,
  sprite,
  label,
  selected,
  badge,
  onClick,
  imageUrl,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (imageUrl) return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 48, 48);
    if (!atlas || !sprite) {
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, 32, 32);
      return;
    }
    const frame = atlas.getFrame(sprite);
    const scale = Math.max(
      1,
      Math.floor(Math.min(40 / frame.frame.w, 40 / frame.frame.h)),
    );
    const dw = frame.frame.w * scale;
    const dh = frame.frame.h * scale;
    const dx = Math.floor((48 - dw) / 2);
    const dy = Math.floor((48 - dh) / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      atlas.image,
      frame.frame.x,
      frame.frame.y,
      frame.frame.w,
      frame.frame.h,
      dx,
      dy,
      dw,
      dh,
    );
  }, [atlas, sprite]);

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "relative flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border-2 bg-card p-1 transition-bouncy min-h-12 min-w-12",
        selected
          ? "border-foreground shadow-[4px_4px_0_0_#8b5cf6] ring-2 ring-accent"
          : "border-border hover:border-foreground",
      )}
    >
      <canvas ref={ref} width={48} height={48} className="pixelated" hidden={!!imageUrl} />
      {imageUrl ? (
        <img
          src={imageUrl}
          width={48}
          height={48}
          alt=""
          draggable={false}
          className="object-contain"
        />
      ) : null}
      {badge && (
        <span className="absolute -right-1 -top-1 rounded-full border border-foreground bg-accent px-1.5 text-[9px] font-bold text-accent-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}
