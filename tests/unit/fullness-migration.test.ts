import { describe, expect, it } from "vitest";
import { LIFE } from "@/game/life/content";
import { migrateSave } from "@/game/storage/migrate";

function v19Save(fullness?: unknown) {
  return {
    stage: "student" as const,
    showCharacter: true,
    totalMinutes: 8 * 60 + 3 * 24 * 60 + 7,
    career: {
      players: {
        money: 42,
        energy: 33,
        health: 55,
        mood: 61,
        reputation: 7,
        ...(fullness === undefined ? {} : { fullness }),
      },
      player_skills: [{ skill_id: "frontend", level: 3, xp: 4 }],
      life: { slotsSinceMeal: 9, workStreak: 2, mealsToday: 1, homeDays: 3 },
    },
  };
}

describe("fullness migration", () => {
  it("a v19 save wakes up full, keeps every other field, and drops slotsSinceMeal", () => {
    const saved = migrateSave(v19Save(), 19);
    expect(saved.career.players.fullness).toBe(LIFE.fullness_default_migrate);
    expect(saved.career.players.money).toBe(42);
    expect(saved.career.players.energy).toBe(33);
    expect(saved.career.players.health).toBe(55);
    expect(saved.career.players.mood).toBe(61);
    expect(saved.career.players.reputation).toBe(7);
    expect(saved.career.player_skills.find((skill) => skill.skill_id === "frontend")).toMatchObject({
      level: 3,
      xp: 4,
    });
    expect(saved.career.life.workStreak).toBe(2);
    expect(saved.career.life.mealsToday).toBe(1);
    expect(saved.career.life.homeDays).toBe(3);
    expect(saved.career.life).not.toHaveProperty("slotsSinceMeal");
    // The clock keeps ticking from the stored totalMinutes; no offline catch-up.
    expect(saved.totalMinutes).toBe(8 * 60 + 3 * 24 * 60 + 7);
  });

  it("a missing or corrupt fullness falls back to the default", () => {
    for (const bad of [Number.NaN, -5, 150, "oops", null]) {
      const saved = migrateSave(v19Save(bad), 19);
      expect(saved.career.players.fullness).toBe(LIFE.fullness_default_migrate);
    }
  });

  it("an already-valid fullness from a newer save is kept as-is", () => {
    const saved = migrateSave(v19Save(23.5), 20);
    expect(saved.career.players.fullness).toBe(23.5);
  });
});
