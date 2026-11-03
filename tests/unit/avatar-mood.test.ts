import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AVATAR_MOOD_THRESHOLD,
  MOOD_AVATAR_FILE,
  SICK_MOOD_AVATAR_FILE,
  avatarMoodSrc,
  getAvatarMood,
  type AvatarMood,
  type AvatarMoodStats,
} from "@/game/vitals/avatarMood";

const FINE: AvatarMoodStats = { health: 70, fullness: 100, mood: 70 };

function stats(patch: Partial<AvatarMoodStats>): AvatarMoodStats {
  return { ...FINE, ...patch };
}

describe("getAvatarMood", () => {
  it("uses 30 as the low line, and 30 itself stays fine", () => {
    expect(AVATAR_MOOD_THRESHOLD).toBe(30);
    expect(getAvatarMood(stats({ health: 30, fullness: 30, mood: 30 }))).toBe("normal");
    expect(getAvatarMood(stats({ health: 29.999 }))).toBe("sick");
    expect(getAvatarMood(stats({ fullness: 29.999 }))).toBe("hungry");
    expect(getAvatarMood(stats({ mood: 29.999 }))).toBe("stress");
  });

  it("maps each low vital on its own", () => {
    expect(getAvatarMood(stats({ health: 0 }))).toBe("sick");
    expect(getAvatarMood(stats({ health: 29 }))).toBe("sick");
    expect(getAvatarMood(stats({ fullness: 0 }))).toBe("hungry");
    expect(getAvatarMood(stats({ fullness: 29 }))).toBe("hungry");
    expect(getAvatarMood(stats({ mood: 0 }))).toBe("stress");
    expect(getAvatarMood(stats({ mood: 29 }))).toBe("stress");
    expect(getAvatarMood(FINE)).toBe("normal");
    expect(getAvatarMood(stats({ health: 100, fullness: 100, mood: 100 }))).toBe("normal");
  });

  it("prioritizes sick over hungry over stress", () => {
    const cases: { patch: Partial<AvatarMoodStats>; mood: AvatarMood }[] = [
      { patch: { health: 10, fullness: 10, mood: 10 }, mood: "sick" },
      { patch: { health: 10, fullness: 10, mood: 80 }, mood: "sick" },
      { patch: { health: 10, fullness: 80, mood: 10 }, mood: "sick" },
      { patch: { health: 29, fullness: 100, mood: 100 }, mood: "sick" },
      { patch: { health: 30, fullness: 10, mood: 10 }, mood: "hungry" },
      { patch: { health: 80, fullness: 0, mood: 0 }, mood: "hungry" },
      { patch: { health: 100, fullness: 29, mood: 100 }, mood: "hungry" },
      { patch: { health: 30, fullness: 30, mood: 0 }, mood: "stress" },
      { patch: { health: 100, fullness: 50, mood: 29 }, mood: "stress" },
    ];
    for (const entry of cases) {
      expect(getAvatarMood(stats(entry.patch)), JSON.stringify(entry.patch)).toBe(entry.mood);
    }
  });
});

describe("mood portrait files", () => {
  it("points sick at the tired portrait until a dedicated file exists", () => {
    expect(SICK_MOOD_AVATAR_FILE).toBe("tired.png");
    expect(MOOD_AVATAR_FILE.sick).toBe(SICK_MOOD_AVATAR_FILE);
    expect(avatarMoodSrc("sick")).toBe("/avatars/mood/tired.png");
    expect(avatarMoodSrc("normal")).toBe("/avatars/mood/normal.png");
    expect(avatarMoodSrc("hungry")).toBe("/avatars/mood/hungry.png");
    expect(avatarMoodSrc("stress")).toBe("/avatars/mood/stress.png");
  });

  it("ships a file for every mood, including the sick stand-in", () => {
    const moods: AvatarMood[] = ["normal", "hungry", "stress", "sick"];
    for (const mood of moods) {
      const file = join(process.cwd(), "public/avatars/mood", MOOD_AVATAR_FILE[mood]);
      expect(existsSync(file), file).toBe(true);
    }
  });
});
