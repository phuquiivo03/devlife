import { describe, expect, it } from "vitest";
import { applyWake, defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import { LIFE, type FoodId } from "@/game/life/content";
import { eatMeal, mealBlocked, resolveMorning, setFullness, tickFullness } from "@/game/life/logic";

function freshCareer() {
  return defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
}

describe("fullness drain", () => {
  it("drains 100 → 0 after exactly 480 waking minutes, and 50 after 240", () => {
    const start = freshCareer();
    expect(start.players.fullness).toBe(LIFE.fullness_max);
    const empty = tickFullness(start, 480);
    expect(empty.state.players.fullness).toBeCloseTo(0, 6);
    expect(empty.state.players.health).toBe(start.players.health);
    const half = tickFullness(start, 240);
    expect(half.state.players.fullness).toBeCloseTo(50, 6);
    expect(half.state.players.health).toBe(start.players.health);
  });

  it("charges starvation health only for the minutes after fullness hits 0", () => {
    const empty = { ...freshCareer(), players: { ...freshCareer().players, fullness: 0 } };
    const hour = tickFullness(empty, 60);
    expect(empty.players.health - hour.state.players.health).toBeCloseTo(4, 6);
    const halfHour = tickFullness(empty, 30);
    expect(empty.players.health - halfHour.state.players.health).toBeCloseTo(2, 6);
  });

  it("splits a batch: fullness 5 over 60 minutes drains 24 minutes then starves 36", () => {
    const start = { ...freshCareer(), players: { ...freshCareer().players, fullness: 5 } };
    const ticked = tickFullness(start, 60);
    expect(ticked.state.players.fullness).toBeCloseTo(0, 6);
    expect(start.players.health - ticked.state.players.health).toBeCloseTo(2.4, 6);
  });

  it("does not tick while asleep", () => {
    const start = freshCareer();
    const slept = tickFullness(start, 600, { asleep: true });
    expect(slept.state).toBe(start);
    expect(slept.state.players.fullness).toBe(start.players.fullness);
    expect(slept.state.players.health).toBe(start.players.health);
  });
});

describe("fullness batches equal minute-by-minute play", () => {
  it("600 minutes in one call equals 600 single minutes", () => {
    const start = { ...freshCareer(), players: { ...freshCareer().players, fullness: 50 } };
    const once = tickFullness(start, 600).state;
    let stepped = start;
    for (let i = 0; i < 600; i += 1) stepped = tickFullness(stepped, 1).state;
    expect(once.players.fullness).toBeCloseTo(stepped.players.fullness, 6);
    expect(once.players.health).toBeCloseTo(stepped.players.health, 6);
  });

  it("a span past MINUTE_EVENT_COALESCE_AFTER gives the same result in one call", () => {
    const start = { ...freshCareer(), players: { ...freshCareer().players, fullness: 50 } };
    const once = tickFullness(start, 3 * 24 * 60).state;
    let stepped = start;
    for (let i = 0; i < 3 * 24 * 60; i += 1) stepped = tickFullness(stepped, 1).state;
    expect(once.players.fullness).toBeCloseTo(stepped.players.fullness, 6);
    expect(once.players.health).toBeCloseTo(stepped.players.health, 6);
  });

  it("×1, ×10, and ×60 speed produce identical vitals for the same elapsed time", () => {
    const start = { ...freshCareer(), players: { ...freshCareer().players, fullness: 50 } };
    // ×1 emits one minute event per game minute; ×10 chunks of 6; ×60 per-frame
    // chunks of ~25, and a 3-day jump coalesces to one event per hour segment.
    const chunked = tickFullness(tickFullness(tickFullness(start, 137).state, 259).state, 204).state;
    const once = tickFullness(start, 137 + 259 + 204).state;
    expect(chunked.players.fullness).toBeCloseTo(once.players.fullness, 6);
    expect(chunked.players.health).toBeCloseTo(once.players.health, 6);
  });
});

describe("sleep and wake", () => {
  it("sleep does not drain fullness, and waking sets fullness_wake", () => {
    const start = { ...freshCareer(), players: { ...freshCareer().players, fullness: 40, energy: 40 } };
    const woke = applyWake(start, 8);
    expect(woke.state.players.fullness).toBe(LIFE.fullness_wake);
    // Sleep itself charged no starvation: health only moves by the wake resolution.
    expect(woke.state.players.health).toBe(start.players.health);
    expect(woke.state.life.hungryNoticed).toBe(false);
    expect(woke.state.life.starvingNoticed).toBe(false);
  });

  it("resolveMorning resets the notice flags for the new hungry cycle", () => {
    const start = freshCareer();
    const noticed = tickFullness(tickFullness(start, 420).state, 60).state;
    expect(noticed.life.hungryNoticed).toBe(true);
    expect(noticed.life.starvingNoticed).toBe(true);
    const morning = resolveMorning(noticed, noticed.players.game_day + 1);
    expect(morning.state.players.fullness).toBe(LIFE.fullness_wake);
    expect(morning.state.life.hungryNoticed).toBe(false);
    expect(morning.state.life.starvingNoticed).toBe(false);
  });
});

describe("eating", () => {
  it("blocks at or above fullness_eat_block with the configured reason", () => {
    const start = freshCareer();
    expect(mealBlocked(start, "noodles")).toBe(LIFE.fullness_eat_block);
    expect(mealBlocked(setFullness(start, LIFE.fullness_eat_below).state, "noodles")).toBe(
      LIFE.fullness_eat_block,
    );
    expect(mealBlocked(setFullness(start, LIFE.fullness_eat_below - 0.5).state, "noodles")).toBeNull();
    expect(mealBlocked(start, "phantom" as FoodId)).toBe("Không có món này");
  });

  it("still blocks on money after the fullness gate passes", () => {
    const start = { ...freshCareer(), players: { ...freshCareer().players, fullness: 20, money: 100 } };
    expect(mealBlocked(start, "bun_bo")).toBe("Không đủ tiền");
  });

  it("eating sets fullness_after_meal, charges the price, and keeps the food health", () => {
    const start = { ...freshCareer(), players: { ...freshCareer().players, fullness: 10 } };
    const noodles = eatMeal(start, "noodles");
    expect(noodles.state.players.fullness).toBe(LIFE.fullness_after_meal);
    expect(noodles.state.players.money).toBe(start.players.money - 8_000);
    expect(noodles.state.players.health).toBe(start.players.health - 3);
    expect(noodles.state.life.mealsToday).toBe(1);
    expect(noodles.state.life.hungryNoticed).toBe(false);
    expect(noodles.state.life.starvingNoticed).toBe(false);
    // Fullness is 100 ≥ 30 now, so a second bite is blocked without a meal cap.
    expect(mealBlocked(noodles.state, "noodles")).toBe(LIFE.fullness_eat_block);
    expect(eatMeal(noodles.state, "noodles").state).toBe(noodles.state);
  });

  it("bún bò lifts mood by 5 and gà chiên by 10", () => {
    const start = { ...freshCareer(), players: { ...freshCareer().players, fullness: 10 } };
    expect(eatMeal(start, "bun_bo").state.players.mood).toBe(start.players.mood + 5);
    expect(eatMeal(start, "ga_chien").state.players.mood).toBe(start.players.mood + 10);
    // Plain foods leave mood alone.
    expect(eatMeal(start, "noodles").state.players.mood).toBe(start.players.mood);
  });

  it("debug setFullness clamps through the normal vitals path", () => {
    const start = freshCareer();
    const hungry = setFullness(start, 20);
    expect(hungry.state.players.fullness).toBe(20);
    const over = setFullness(start, 140);
    expect(over.state.players.fullness).toBe(LIFE.fullness_max);
  });
});

describe("fullness notices", () => {
  it("pushes Bụng đói once per cycle with an eat action", () => {
    const start = freshCareer();
    const hungry = tickFullness(start, 420).state;
    expect(hungry.players.fullness).toBeLessThan(LIFE.fullness_eat_below);
    const hungryRows = hungry.feed.notices.filter((notice) => notice.text === LIFE.fullness_hungry_notice);
    expect(hungryRows).toEqual([
      expect.objectContaining({ action: "eat", severity: "warn", id: "fullness-hungry-1-0" }),
    ]);
    expect(hungry.life.hungryNoticed).toBe(true);
    const hungrier = tickFullness(hungry, 60).state;
    expect(
      hungrier.feed.notices.filter((notice) => notice.text === LIFE.fullness_hungry_notice),
    ).toHaveLength(1);
  });

  it("pushes Đói lả once when fullness reaches 0, and no duplicates while starving", () => {
    const start = freshCareer();
    const starving = tickFullness(start, 480).state;
    expect(starving.players.fullness).toBe(0);
    const rows = starving.feed.notices.filter((notice) => notice.text === LIFE.fullness_starving_notice);
    expect(rows).toEqual([
      expect.objectContaining({ action: "eat", severity: "urgent", id: "fullness-starving-1-0" }),
    ]);
    expect(starving.life.starvingNoticed).toBe(true);
    const still = tickFullness(starving, 60).state;
    expect(
      still.feed.notices.filter((notice) => notice.text === LIFE.fullness_starving_notice),
    ).toHaveLength(1);
  });

  it("the hungry notice returns after eating and going hungry again", () => {
    let state = tickFullness(freshCareer(), 420).state;
    expect(state.feed.notices.filter((notice) => notice.text === LIFE.fullness_hungry_notice)).toHaveLength(1);
    const fed = eatMeal(setFullness(state, 20).state, "banh_mi").state;
    expect(fed.life.hungryNoticed).toBe(false);
    state = tickFullness(fed, 420).state;
    const rows = state.feed.notices.filter((notice) => notice.text === LIFE.fullness_hungry_notice);
    expect(rows).toHaveLength(2);
    expect(rows[1]!.id).toBe("fullness-hungry-1-1");
  });

  it("both notices fire in one long batch when fullness crosses both levels", () => {
    const state = tickFullness(freshCareer(), 3 * 24 * 60).state;
    expect(state.feed.notices.filter((notice) => notice.text === LIFE.fullness_hungry_notice)).toHaveLength(1);
    expect(state.feed.notices.filter((notice) => notice.text === LIFE.fullness_starving_notice)).toHaveLength(1);
  });
});
