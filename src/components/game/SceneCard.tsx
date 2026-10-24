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
  /**
   * 3D mode: transparent 4:3 slot floating on the page background — no
   * card face, plate, or glow. Overlays (LifeRoomFx, LifeEventPopup,
   * SleepTransition) mount absolutely over the canvas, never below it.
   */
  bare?: boolean;
};

/**
 * Big rounded scene card — the room viewport of the pastel redesign.
 * The canvas slot fills the card and SceneCanvas / Scene3D keep their own
 * view fitting. Overlays (LifeRoomFx, LifeEventPopup, SleepTransition)
 * mount absolutely on top of the canvas area.
 */
export function SceneCard({
  areaRef,
  roomAreaStyle,
  label,
  children,
  canvas,
  bare = false,
}: Props) {
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      areaRef.current = node;
    },
    [areaRef],
  );

  return (
    <section
      className={
        bare
          ? "scene-bare relative mx-auto flex w-full flex-col overflow-hidden"
          : "relative flex min-h-[320px] w-full flex-1 flex-col overflow-hidden rounded-panel bg-panel shadow-panel"
      }
      aria-label="Phòng"
    >
      {label ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[70%] truncate rounded-[var(--radius-chip)] bg-white/90 px-3 py-1 font-galmuri-7 text-galmuri-small text-[var(--foreground)] shadow-chip">
          {label}
        </div>
      ) : null}
      <div
        ref={setRefs}
        className={
          bare
            ? "flex min-h-0 w-full flex-1 flex-col"
            : "room-stage-glow flex min-h-0 w-full flex-1 items-center justify-center bg-[var(--scene-plate)]"
        }
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
