import { describe, expect, it } from "vitest";
import { hideChairForPose, poseForRoom, seatDrawsChair } from "@/game3d/pose";

describe("seat pose", () => {
  it("puts a fresh student on the floor and hides the desk chair", () => {
    expect(poseForRoom({ stage: "student", sleeping: false, owned: [], loadout: {} })).toBe("floor");
    expect(hideChairForPose("floor", "ergo_chair")).toBe(true);
    expect(hideChairForPose("floor", "chair_plastic")).toBe(true);
    expect(hideChairForPose("floor", "junior_office_chair")).toBe(true);
    expect(hideChairForPose("sit", "ergo_chair")).toBe(false);
    expect(hideChairForPose("sit", "junior_office_chair")).toBe(false);
    expect(hideChairForPose("sit", "stool_plastic")).toBe(false);
    expect(hideChairForPose("floor", "bed")).toBe(false);
  });

  it("sits when a chair is actually at the desk", () => {
    expect(
      seatDrawsChair("student", {}, new Set(["ergo_chair"])),
    ).toBe(true);
    expect(
      poseForRoom({
        stage: "student",
        sleeping: false,
        owned: ["monitor2"],
        loadout: {},
      }),
    ).toBe("sit");
    expect(
      poseForRoom({
        stage: "student",
        sleeping: false,
        owned: [],
        loadout: { seat: "senior.ergo_chair" },
      }),
    ).toBe("sit");
    expect(
      poseForRoom({
        stage: "junior",
        sleeping: false,
        owned: [],
        loadout: {},
      }),
    ).toBe("sit");
    expect(
      poseForRoom({
        stage: "senior",
        sleeping: false,
        owned: [],
        loadout: {},
      }),
    ).toBe("sit");
  });

  it("floors when the seat is emptied, even if an ergo chair is owned", () => {
    expect(
      poseForRoom({
        stage: "student",
        sleeping: false,
        owned: ["ergo_chair", "monitor2"],
        loadout: { seat: null },
      }),
    ).toBe("floor");
    expect(
      poseForRoom({
        stage: "junior",
        sleeping: false,
        owned: [],
        loadout: { seat: null },
      }),
    ).toBe("floor");
  });

  it("hides the player while sleeping", () => {
    expect(
      poseForRoom({ stage: "senior", sleeping: true, owned: [], loadout: {} }),
    ).toBe("sleep");
  });
});
