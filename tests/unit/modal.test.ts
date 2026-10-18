import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MODAL, modalContentStyle, modalOverlayStyle } from "@/components/ui/modal.config";
import { STORE_MODAL_MAX_PX } from "@/components/game/store-button.config";

describe("modal shell", () => {
  it("stacks with the existing overlays", () => {
    expect(MODAL.overlayZ).toBe(40);
    expect(MODAL.contentZ).toBe(50);
    expect(modalOverlayStyle()).toMatchObject({
      zIndex: 40,
      backgroundColor: "rgba(42, 37, 72, 0.45)",
      animationDuration: "160ms",
    });
    expect(modalContentStyle()).toMatchObject({
      zIndex: 50,
      animationDuration: "160ms",
      maxHeight: "80vh",
      width: "min(calc(100vw - 32px), 420px)",
      "--modal-rise": "4px",
    });
    expect(modalContentStyle(STORE_MODAL_MAX_PX).width).toBe("min(calc(100vw - 32px), 640px)");
  });

  it("traps focus, closes from Escape and the backdrop, and sets aria-modal", () => {
    const source = readFileSync(join(process.cwd(), "src/components/ui/modal.tsx"), "utf8");
    expect(source).toContain("@radix-ui/react-dialog");
    expect(source).toContain("Dialog.Content");
    expect(source).toContain("Dialog.Overlay");
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("Dialog.Title");
    expect(source).toContain("Dialog.Close");
  });

  it("skips the open animation when motion is reduced", () => {
    const css = readFileSync(join(process.cwd(), "src/components/ui/modal.module.css"), "utf8");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(/animation:\s*none/);
    expect(css).toContain("var(--modal-rise)");
    expect(MODAL.enterMs).toBe(160);
    expect(MODAL.risePx).toBe(4);
    expect(MODAL.chromePx).toBe(112);
  });
});
