import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MODAL } from "@/components/ui/modal.config";
import {
  CENTER_COLUMN_MAX_PX,
  ROOM_STATUS_BAR,
  ROOM_VIEWPORT_W,
  SHELL_LAYOUT,
  roomStatusBarVars,
  roomStatusClockLabel,
  shellPanelMaxHeight,
  shellPanelVars,
} from "@/components/game/shell-layout.config";

describe("desktop side panels", () => {
  it("caps the columns at the viewport minus the header and both margins", () => {
    expect(SHELL_LAYOUT.headerPx).toBe(56);
    expect(SHELL_LAYOUT.marginYPx).toBe(24);
    expect(SHELL_LAYOUT.desktopMinPx).toBe(1024);
    expect(shellPanelMaxHeight()).toBe("calc(100vh - 104px)");
    const vars = shellPanelVars();
    expect(SHELL_LAYOUT.stickyTopPx).toBe(0);
    expect(vars["--shell-panel-top"]).toBe("0px");
    expect(vars["--shell-panel-max"]).toBe("calc(100vh - 104px)");
    expect(vars["--shell-panel-z"]).toBe(String(SHELL_LAYOUT.panelZ));
  });

  it("keeps the panel stack under the banner, modals, and tooltips", () => {
    expect(SHELL_LAYOUT.panelZ).toBeLessThan(SHELL_LAYOUT.overlayFloorZ);
    expect(SHELL_LAYOUT.overlayFloorZ).toBe(30);
    expect(SHELL_LAYOUT.panelZ).toBeLessThan(MODAL.overlayZ);
    const life = readFileSync(join(process.cwd(), "src/components/game/LifeStage.tsx"), "utf8");
    const tooltip = readFileSync(join(process.cwd(), "src/components/ui/tooltip.tsx"), "utf8");
    expect(life).toContain("z-30");
    expect(tooltip).toContain("z-40");
  });

  it("builds the desktop shell as a top bar over a scene column and a sidebar", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/game/shell-layout.module.css"),
      "utf8",
    );
    const shell = readFileSync(join(process.cwd(), "src/components/game/GameShell.tsx"), "utf8");
    // Pastel redesign: no sticky panel measurement, the sidebar scrolls itself.
    expect(css).not.toContain("position: sticky");
    expect(shell).not.toContain("shellPanelVars");
    expect(shell).toContain('data-side-panel="player"');
    expect(shell).toContain("lg:h-screen");
    expect(shell).toContain("lg:overflow-hidden");
    expect(shell).toContain("lg:grid-cols-[minmax(0,1fr)_360px]");
    expect(shell).toContain("<SceneCard");
    expect(shell).toContain("lg:overflow-y-auto");
  });

  it("keeps the top bar metrics and the full-bleed shell", () => {
    expect(ROOM_VIEWPORT_W).toBe(480);
    expect(CENTER_COLUMN_MAX_PX).toBe(520);
    expect(ROOM_STATUS_BAR.maxWidthPx).toBe(CENTER_COLUMN_MAX_PX);
    expect(ROOM_STATUS_BAR.maxWidthPx).toBeGreaterThan(ROOM_VIEWPORT_W);
    expect(ROOM_STATUS_BAR.separator).toBe(" · ");
    expect(roomStatusClockLabel(1, "T2", "08:12", "Sáng")).toBe("Ngày 1 · T2 · 08:12 Sáng");
    const vars = roomStatusBarVars();
    expect(vars["--room-status-max"]).toBe("520px");
    expect(vars["--room-status-gap"]).toBe(`${ROOM_STATUS_BAR.gapBelowPx}px`);
    expect(vars["--room-status-cluster"]).toBe(`${ROOM_STATUS_BAR.clusterGapPx}px`);
    const css = readFileSync(
      join(process.cwd(), "src/components/game/shell-layout.module.css"),
      "utf8",
    );
    expect(css).toContain(".statusBar");
    expect(css).toContain("flex-wrap");
    expect(css).toContain("margin-left: auto");
    expect(css).not.toContain("max-height");
    const shell = readFileSync(join(process.cwd(), "src/components/game/GameShell.tsx"), "utf8");
    expect(shell).toContain("<TopBar");
    expect(shell).not.toContain("const ROOM_VIEWPORT_W");
  });
});
