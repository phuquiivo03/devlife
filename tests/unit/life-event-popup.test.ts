import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MODAL } from "@/components/ui/modal.config";
import { SHELL_LAYOUT } from "@/components/game/shell-layout.config";
import {
  LIFE_EVENT_POPUP,
  lifeEventPopupLayerOk,
  lifeEventPopupStyle,
} from "@/components/game/life-event-popup.config";

describe("life event popup", () => {
  it("uses the approved canvas size and sits between panels and modals", () => {
    expect(LIFE_EVENT_POPUP.widthPx).toBe(424);
    expect(LIFE_EVENT_POPUP.heightPx).toBe(186);
    expect(LIFE_EVENT_POPUP.insetPx).toBeGreaterThan(0);
    expect(LIFE_EVENT_POPUP.enterMs).toBeGreaterThan(0);
    expect(LIFE_EVENT_POPUP.risePx).toBeGreaterThan(0);
    expect(lifeEventPopupLayerOk()).toBe(true);
    expect(LIFE_EVENT_POPUP.zIndex).toBeGreaterThan(SHELL_LAYOUT.panelZ);
    expect(LIFE_EVENT_POPUP.zIndex).toBeLessThan(SHELL_LAYOUT.overlayFloorZ);
    expect(LIFE_EVENT_POPUP.zIndex).toBeLessThan(MODAL.overlayZ);
  });

  it("publishes the size, layer, and motion as custom properties", () => {
    expect(lifeEventPopupStyle()).toEqual({
      zIndex: LIFE_EVENT_POPUP.zIndex,
      "--event-popup-z": String(LIFE_EVENT_POPUP.zIndex),
      "--event-popup-w": `${LIFE_EVENT_POPUP.widthPx}px`,
      "--event-popup-h": `${LIFE_EVENT_POPUP.heightPx}px`,
      "--event-popup-num-w": String(LIFE_EVENT_POPUP.widthPx),
      "--event-popup-num-h": String(LIFE_EVENT_POPUP.heightPx),
      "--event-popup-inset": `${LIFE_EVENT_POPUP.insetPx}px`,
      "--event-popup-enter": `${LIFE_EVENT_POPUP.enterMs}ms`,
      "--event-popup-rise": `${LIFE_EVENT_POPUP.risePx}px`,
      "--event-popup-border": LIFE_EVENT_POPUP.border,
    });
  });

  it("anchors the card on the canvas, lets clicks through, and skips motion when reduced", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/game/life-event-popup.module.css"),
      "utf8",
    );
    expect(css).toContain("align-items: flex-end");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("pointer-events: auto");
    expect(css).toContain("var(--event-popup-w)");
    expect(css).toContain("translateY(var(--event-popup-rise))");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("animation: none");
    expect(css).not.toMatch(/background:\s*rgba\(0,\s*0,\s*0/);
  });

  it("mounts on the room canvas and leaves the old bottom bar and dim behind", () => {
    const shell = readFileSync(join(process.cwd(), "src/components/game/GameShell.tsx"), "utf8");
    const life = readFileSync(join(process.cwd(), "src/components/game/LifeStage.tsx"), "utf8");
    const popup = readFileSync(join(process.cwd(), "src/components/game/LifeEventPopup.tsx"), "utf8");
    const frame = shell.indexOf("<RoomChamferFrame");
    const frameEnd = shell.indexOf("</RoomChamferFrame>");
    const inside = shell.slice(frame, frameEnd);
    expect(inside).toContain("<LifeEventPopup />");
    expect(shell.indexOf("<LifeEventPopup />")).toBeGreaterThan(frame);
    expect(shell.indexOf("<LifeEventPopup />")).toBeLessThan(frameEnd);
    expect(life).not.toContain("life-dialog");
    expect(life).not.toContain("life-dim");
    expect(life).not.toContain("bg-black/45");
    expect(popup).toContain('variant="light"');
    expect(popup).toContain('data-testid="life-dialog"');
    expect(popup).toContain("life-choice-");
    expect(popup).toContain("chooseLife");
    expect(popup).toContain("event.text");
  });
});