import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { applyDayStarted, applyStudy, applyWake, defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import { M5_ASSET_KEYS, m5AssetPath } from "@/game/life/assets";
import { LIFE } from "@/game/life/content";
import {
  applyActionStats,
  applyEventStats,
  applySleepRest,
  calendar,
  crossWakingSlot,
  eatMeal,
  energyCost,
  holidayOn,
  hoursUntilWake,
  jobPay,
  mealBlocked,
  resolveMorning,
  scaleXpForMood,
  slotBudget,
  slotIndexFromWake,
} from "@/game/life/logic";
import { playLifeSound, LIFE_SOUND_KEYS } from "@/game/life/sounds";
import { migrateSave } from "@/game/storage/migrate";
import { startTask } from "@/game/task-run/apply";

describe("life calendar", () => {
  it("uses 28-day months, Monday on day 1, and weekend slot counts", () => {
    expect(calendar(1)).toMatchObject({ month: 1, dayOfMonth: 1, weekday: 0, weekdayLabel: "T2", weekend: false });
    expect(calendar(6)).toMatchObject({ weekdayLabel: "T7", weekend: true });
    expect(calendar(7)).toMatchObject({ weekdayLabel: "CN", weekend: true });
    expect(calendar(29)).toMatchObject({ month: 2, dayOfMonth: 1, weekday: 0 });
    expect(slotBudget(1)).toBe(10);
    expect(slotBudget(6)).toBe(12);
    expect(slotIndexFromWake(6 * 60)).toBe(0);
    expect(slotIndexFromWake(2 * 60)).toBe(10);
    expect(holidayOn(1)).toBe("tet");
    expect(holidayOn(3)).toBe("tet");
    expect(holidayOn(4)).toBeNull();
    expect(holidayOn(28 * 3 + 28)).toBe("april_30");
    expect(holidayOn(28 * 4 + 1)).toBe("may_day");
    expect(holidayOn(28 * 7 + 15)).toBe("mid_autumn");
    expect(holidayOn(28 * 10 + 26)).toBe("black_friday");
  });
});

describe("life stats", () => {
  it("diminishes a repeated positive mood, then resets in the morning", () => {
    const start = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const first = applyActionStats(start, { mood: 10 });
    const second = applyActionStats(first.state, { mood: 10 });
    expect(first.state.players.mood).toBeCloseTo(80, 5);
    expect(second.state.players.mood).toBeCloseTo(80 + 6, 5);
    expect(second.state.life.positiveMoodApplies).toBe(2);
    const morning = resolveMorning(second.state, 2);
    expect(morning.state.life.positiveMoodApplies).toBe(0);
  });

  it("multiplies energy cost at a 3-day work streak and leaves event effects flat", () => {
    expect(energyCost(10, 2)).toBe(10);
    expect(energyCost(10, 3)).toBeCloseTo(12, 5);
    const start = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const streak = { ...start, life: { ...start.life, workStreak: 3 } };
    const acted = applyActionStats(streak, { energy: -10, mood: 10 });
    expect(acted.state.players.energy).toBeCloseTo(70 - 12, 5);
    const evented = applyEventStats(streak, { energy: -10, mood: 10 });
    expect(evented.state.players.energy).toBe(60);
    expect(evented.state.players.mood).toBe(80);
    expect(evented.state.life.positiveMoodApplies).toBe(0);
  });

  it("sleeps 8h to full energy and punishes a 4h night", () => {
    expect(hoursUntilWake(22 * 60)).toBe(8);
    expect(hoursUntilWake(2 * 60)).toBe(4);
    const start = defaultCareer(1, 22 * 60, "student", SIM_CATALOG);
    const tired = { ...start, players: { ...start.players, energy: 40 } };
    const full = applySleepRest(tired, 8);
    expect(full.state.players.energy).toBe(100);
    expect(full.state.life.moodPenaltyTomorrow).toBe(0);
    const short = applySleepRest({ ...tired, players: { ...tired.players, health: 80 } }, 4);
    expect(short.state.players.energy).toBe(90);
    expect(short.state.players.health).toBe(72);
    expect(short.state.life.moodPenaltyTomorrow).toBe(5);
    const woke = applyWake({ ...tired, players: { ...tired.players, health: 80 } }, 4);
    expect(woke.state.players.mood).toBeCloseTo(70 - 5 - 1, 5);
  });

  it("ends the day from meals, regresses mood, and ticks a waking slot", () => {
    const start = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const ended = applyDayStarted(start, 2, 0, "student", SIM_CATALOG, { resolveMorning: false });
    // No meals-low penalty anymore: hourly starvation replaced it.
    expect(ended.state.players.health).toBe(70);
    expect(ended.state.players.mood).toBeCloseTo(70 + (60 - 70) * 0.1, 5);
    const fed = {
      ...start,
      life: { ...start.life, mealsToday: 3, workedToday: true, workStreak: 2, funSlotsToday: 0 },
    };
    const third = applyDayStarted(fed, 2, 0, "student", SIM_CATALOG, { resolveMorning: false });
    expect(third.state.players.health).toBe(72);
    expect(third.state.life.workStreak).toBe(3);
    expect(third.state.players.mood).toBeLessThan(70);
    const slot = crossWakingSlot(start, 10 * 60);
    expect(slot.state.players.mood).toBe(69);
    const late = crossWakingSlot(start, 2 * 60);
    expect(late.state.players.health).toBe(66);
    expect(late.state.life.moodPenaltyTomorrow).toBe(5);
  });

  it("locks jobs under 15 energy, scales low-mood XP, and hospitals under 10 health", () => {
    expect(scaleXpForMood(10, 30)).toBe(10);
    expect(scaleXpForMood(10, 29)).toBe(7);
    const start = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const board = applyDayStarted(start, 1, 8 * 60, "student", SIM_CATALOG, { resolveMorning: false });
    const offer = board.state.player_jobs.find((job) => job.status === "offered");
    expect(offer).toBeTruthy();
    const low = {
      ...board.state,
      players: { ...board.state.players, energy: 14 },
    };
    expect(startTask(low, offer!.id, SIM_CATALOG).error).toBe("Dưới 15 năng lượng, chưa nhận việc");
    const sick = applyActionStats(
      { ...start, players: { ...start.players, health: 12 } },
      { health: -3 },
    );
    expect(sick.skipDays).toBe(2);
    expect(sick.state.players.health).toBe(10);
    expect(sick.state.players.money).toBe(SIM_CATALOG.config.starting_money - 1_000_000);
  });
});

describe("life money", () => {
  it("prices food, bills rent on the 1st, and pays the low salary on the 10th", () => {
    const start = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    expect(start.players.money).toBe(3_000_000);
    const hungry = {
      ...start,
      players: { ...start.players, fullness: 20 },
    };
    expect(mealBlocked(start, "noodles")).toBe(LIFE.fullness_eat_block);
    expect(mealBlocked(hungry, "noodles")).toBeNull();
    const noodles = eatMeal(hungry, "noodles");
    expect(noodles.state.players.money).toBe(3_000_000 - 8_000);
    expect(noodles.state.players.health).toBe(67);
    expect(noodles.state.players.fullness).toBe(LIFE.fullness_after_meal);
    expect(noodles.state.life.mealsToday).toBe(1);
    const funded = { ...start, players: { ...start.players, money: 4_000_000 } };
    const day29 = applyDayStarted(funded, 29, 0, "student", SIM_CATALOG, { resolveMorning: false });
    expect(day29.state.players.money).toBe(4_000_000 - 2_800_000 - 600_000);
    expect(day29.state.life.rentDebtDays).toBe(0);
    const poor = { ...start, players: { ...start.players, money: 1_000 } };
    const debt = applyDayStarted(poor, 29, 0, "student", SIM_CATALOG, { resolveMorning: false });
    expect(debt.state.players.money).toBe(1_000);
    expect(debt.state.life.rentDebtDays).toBe(1);
    expect(debt.state.players.mood).toBeLessThan(poor.players.mood);
    const junior = applyDayStarted(start, 10, 0, "junior", SIM_CATALOG, { resolveMorning: false });
    expect(junior.state.players.money).toBe(3_000_000 + 15_000_000);
  });

  it("uses the pay formula and wires every life sound", () => {
    expect(jobPay(100_000, 1, 0)).toBe(88_000);
    expect(jobPay(100_000, 2, 250)).toBe(Math.round(100_000 * 1.2 * 1.8));
    for (const key of LIFE_SOUND_KEYS) {
      expect(playLifeSound(key)).toBe(true);
    }
  });

  it("keeps v5 money and adds default vitals", () => {
    const saved = migrateSave(
      {
        stage: "student",
        showCharacter: true,
        totalMinutes: 480,
        career: { players: { money: 42, energy: 15 } },
      },
      5,
    );
    expect(saved.career.players.money).toBe(42);
    expect(saved.career.players.health).toBe(LIFE.starting_health);
    expect(saved.career.players.mood).toBe(LIFE.starting_mood);
    expect(saved.career.life.mealsToday).toBe(0);
    expect(saved.career.life.wakeBudget).toBe(10);
  });
});

describe("life placeholders", () => {
  it("ships a file for every M5 asset key and keeps loops out of the sprite", () => {
    for (const key of M5_ASSET_KEYS) {
      expect(m5AssetPath(key)).toBe(`/ui/m5/${key}`);
      expect(existsSync(join(process.cwd(), "public", m5AssetPath(key)))).toBe(true);
    }
    const offsets = JSON.parse(readFileSync(join(process.cwd(), "public/audio/sprite/offsets.json"), "utf8"));
    const cues = Object.keys(offsets.ogg?.cues ?? offsets.cues ?? {});
    for (const key of LIFE_SOUND_KEYS) expect(cues).toContain(key);
    expect(cues).not.toContain("sfx_typing_loop");
    expect(cues).not.toContain("sfx_typing_loop_fast");
  });
});

describe("life study force", () => {
  it("spends health when the player forces a course they cannot power", () => {
    const start = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const tired = { ...start, players: { ...start.players, energy: 5 } };
    expect(applyStudy(tired, "html", SIM_CATALOG).error).toBe("Không đủ năng lượng");
    const forced = applyStudy(tired, "html", SIM_CATALOG, true);
    expect(forced.error).toBeNull();
    expect(forced.state.players.health).toBe(65);
    expect(forced.state.players.energy).toBe(0);
  });
});

describe("fullness saves", () => {
  it("gives pre-fullness saves a full No bụng and keeps progress", () => {
    const old = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: {
          players: { money: 42 },
          player_skills: [{ skill_id: "frontend", level: 3, xp: 4 }],
          life: { slotsSinceMeal: 9 },
        },
      },
      14,
    );
    expect(old.career.players.money).toBe(42);
    expect(old.career.players.fullness).toBe(LIFE.fullness_default_migrate);
    expect(old.career.life).not.toHaveProperty("slotsSinceMeal");
    expect(old.career.player_skills.find((skill) => skill.skill_id === "frontend")).toMatchObject({ level: 3, xp: 4 });

    const dated = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: {
          players: { money: 42 },
          player_skills: [{ skill_id: "frontend", level: 3, xp: 4 }],
          feed: { diary: { day: 2, sleptDay: 1, sleptAt: "23:40", money: 0, remaining: 42 } },
        },
      },
      15,
    );
    expect(dated.career.players.money).toBe(42);
    expect(dated.career.feed.diary?.sleptAt).toBeNull();
    expect(dated.career.feed.diary?.sleptDay).toBeNull();
    expect(dated.career.player_skills.find((skill) => skill.skill_id === "frontend")).toMatchObject({ level: 3, xp: 4 });
  });

  it("keeps eat and sleep notice actions when a save loads", () => {
    const acted = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: {
          players: { money: 42 },
          player_skills: [{ skill_id: "frontend", level: 3, xp: 4 }],
          feed: {
            notices: [
              { id: "hunger-1-0", text: "Đói rồi, đi ăn thôi.", action: "eat", severity: "warn" },
              { id: "sick-1", text: "Sức khỏe dưới 30.", action: "sleep", severity: "warn" },
              { id: "rent", text: "Trả trọ.", action: "payRent" },
              { id: "jobs", text: "Việc.", action: "viewJobs" },
              { id: "shop", text: "Cửa hàng.", action: "openStore" },
              { id: "old", text: "Giữ nguyên.", action: "nope" },
            ],
          },
        },
      },
      16,
    );
    expect(acted.career.players.money).toBe(42);
    expect(acted.career.player_skills.find((skill) => skill.skill_id === "frontend")).toMatchObject({ level: 3, xp: 4 });
    expect(acted.career.feed.notices.map((notice) => [notice.id, notice.action])).toEqual([
      ["hunger-1-0", "eat"],
      ["sick-1", "sleep"],
      ["rent", "payRent"],
      ["jobs", "viewJobs"],
      ["shop", "openStore"],
      ["old", null],
    ]);
  });
});
