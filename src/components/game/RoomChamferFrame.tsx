"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  CHAMFER_LAYERS,
  chamferClipStyle,
  chamferScale,
  scaledChamfer,
} from "@/lib/chamfer-frame";

type LayerProps = {
  layer: keyof typeof CHAMFER_LAYERS;
  scale: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function ChamferLayer({
  layer,
  scale,
  className,
  style,
  children,
}: LayerProps) {
  const { corner, padding } = scaledChamfer(CHAMFER_LAYERS[layer], scale);
  return (
    <div
      className={className}
      style={{
        ...chamferClipStyle(corner),
        padding: padding > 0 ? `${padding}px` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type Props = {
  areaRef: React.RefObject<HTMLDivElement | null>;
  roomAreaStyle: CSSProperties | undefined;
  label: ReactNode;
  children: ReactNode;
  canvas: ReactNode;
};

export function RoomChamferFrame({
  areaRef,
  roomAreaStyle,
  label,
  children,
  canvas,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      areaRef.current = node;
    },
    [areaRef],
  );

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(chamferScale(el.clientWidth));
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  const f5 = scaledChamfer(CHAMFER_LAYERS.f5, scale);
  const plate = scaledChamfer(CHAMFER_LAYERS.plate, scale);

  return (
    <div className="flex w-full flex-col items-center">
      <div
        ref={setRefs}
        className="room-canvas-slot flex w-full items-center justify-center"
        style={roomAreaStyle}
      >
        <div className="room-frame-glow w-full max-w-full">
          <ChamferLayer layer="f1" scale={scale} className="panel-frame-f1">
            <ChamferLayer layer="f2" scale={scale} className="panel-frame-f2">
              <ChamferLayer layer="f3" scale={scale} className="panel-frame-f3">
                <div
                  ref={frameRef}
                  className=" relative w-full bg-white flex items-center flex-col"
                  style={chamferClipStyle(CHAMFER_LAYERS.f1.cornerPx)}
                >
                  {canvas}
                  <div className="mt-3 w-full">{children}</div>
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      boxShadow: `inset 0 ${4 * scale}px ${10 * scale}px rgba(0, 0, 0, 0.5)`,
                    }}
                    aria-hidden
                  />
                </div>
              </ChamferLayer>
            </ChamferLayer>
          </ChamferLayer>
        </div>
      </div>
    </div>
  );
}
