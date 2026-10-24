import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lifeEmote } from "@/components/game/life-emote";

const healthy = { health: 100, mood: 100, energy: 100 };

describe("life emote overlay (LifeRoomFx)", () => {
  it("2D: shows the mood cloud when mood < 15", () => {
    expect(lifeEmote({ ...healthy, mood: 14 }, false)).toBe("emote_cloud.png");
    expect(lifeEmote({ ...healthy, mood: 0 }, false)).toBe("emote_cloud.png");
  });

  it("3D (?3d=1): never shows the emote, even when mood < 15", () => {
    expect(lifeEmote({ ...healthy, mood: 14 }, true)).toBeNull();
    expect(lifeEmote({ health: 1, mood: 1, energy: 1 }, true)).toBeNull();
  });

  it("keeps the 2D precedence and thresholds unchanged", () => {
    expect(lifeEmote({ health: 29, mood: 0, energy: 0 }, false)).toBe("emote_cough.png");
    expect(lifeEmote({ ...healthy, mood: 15 }, false)).toBeNull();
    expect(lifeEmote({ ...healthy, energy: 14 }, false)).toBe("emote_sweat.png");
    expect(lifeEmote({ ...healthy, energy: 15 }, false)).toBeNull();
    expect(lifeEmote(healthy, false)).toBeNull();
  });

  it("wires the GameShell ?3d=1 flag to the emote gate but not the bubble", () => {
    const shell = readFileSync(
      join(process.cwd(), "src/components/game/GameShell.tsx"),
      "utf8",
    );
    const life = readFileSync(
      join(process.cwd(), "src/components/game/LifeStage.tsx"),
      "utf8",
    );
    // GameShell passes its is3d (searchParams "3d" === "1") into LifeRoomFx.
    expect(shell).toContain("searchParams.get(\"3d\") === \"1\"");
    expect(shell).toContain("<LifeRoomFx is3d={is3d} />");
    // The emote img renders only through the gate; the bubble stays ungated.
    expect(life).toContain("const emote = lifeEmote({ health, mood, energy }, is3d)");
    expect(life).toContain('data-testid="life-emote"');
    expect(life).toContain('data-testid="life-bubble"');
    expect(life).toContain("const showBubble = bubble != null && bubble.until > now");
    expect(life.indexOf("lifeEmote(")).toBeLessThan(life.indexOf('data-testid="life-emote"'));
  });
});
