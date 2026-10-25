"use client";

import {
  useCallback,
  type CSSProperties,
  type ReactNode,
} from "react";

type Props = {
  areaRef: React.RefObject<HTMLDivElement | null>;
  roomAreaStyle: CSSProperties | undefined;
  label: ReactNode;
  children: ReactNode;
  canvas: ReactNode;
};

/**
 * The room viewport — a transparent slot floating on the page background;
 * Scene3D paints its own deep-purple well. Overlays (LifeRoomFx,
 * LifeEventPopup, SleepTransition) mount absolutely over the canvas,
 * never below it.
 */
export function SceneCard({
  areaRef,
  roomAreaStyle,
  label,
  children,
  canvas,
}: Props) {
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      areaRef.current = node;
    },
    [areaRef],
  );

  return (
    <section
      className="scene-bare relative mx-auto flex w-full flex-col overflow-hidden"
      aria-label="Phòng"
    >
      {label ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[70%] truncate rounded-[var(--radius-chip)] bg-white/90 px-3 py-1 font-galmuri-7 text-galmuri-small text-[var(--foreground)] shadow-chip">
          {label}
        </div>
      ) : null}
      <div
        ref={setRefs}
        className="flex min-h-0 w-full flex-1 flex-col"
        style={roomAreaStyle}
      >
        <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center">
          {canvas}
          {children}
        </div>
      </div>
    </section>
  );
}
