import { describe, expect, it } from "vitest";
import { getRoom } from "@/game/content";
import { itemByKey } from "@/game3d/manifest";
import { activeSeatKey, sitYOnChair } from "@/game3d/sit-height";

describe("sit height", () => {
  it("puts the hips on each chair's measured seat, including the senior rug", () => {
    expect(sitYOnChair("chair_plastic", 0.02)).toBe(0.013);
    expect(sitYOnChair("junior_office_chair", 0.02)).toBe(0.085);
    expect(sitYOnChair("ergo_chair", 0.02)).toBe(0.036);
    expect(sitYOnChair("ergo_chair", 0.026)).toBe(0.042);
    expect(sitYOnChair("stool_plastic", 0.02)).toBeNull();
  });

  it("follows the chair that is actually in the seat", () => {
    expect(activeSeatKey("student", getRoom("student").slots, {}, new Set())).toBe("chair_plastic");
    expect(activeSeatKey("student", getRoom("student").slots, {}, new Set(["ergo_chair"]))).toBe(
      "ergo_chair",
    );
    expect(activeSeatKey("junior", getRoom("junior").slots, {}, new Set())).toBe(
      "junior_office_chair",
    );
    expect(activeSeatKey("junior", getRoom("junior").slots, {}, new Set(["ergo_chair"]))).toBe(
      "ergo_chair",
    );
    expect(activeSeatKey("senior", getRoom("senior").slots, {}, new Set())).toBe("ergo_chair");
    expect(activeSeatKey("junior", getRoom("junior").slots, { seat: null }, new Set())).toBeNull();
  });

  it("matches the manifest sit Y of each room's default chair", () => {
    const cases = [
      ["student", "chair_plastic"],
      ["junior", "junior_office_chair"],
      ["senior", "ergo_chair"],
    ] as const;
    for (const [stage, seat] of cases) {
      const chair = itemByKey(stage, seat);
      expect(sitYOnChair(seat, chair?.position[1] ?? 0)).toBeCloseTo(
        // manifest stores the default-chair hip height
        stage === "student" ? 0.013 : stage === "junior" ? 0.085 : 0.042,
      );
    }
  });
});
