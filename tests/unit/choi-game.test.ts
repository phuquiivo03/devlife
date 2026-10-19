import { describe, expect, it } from "vitest";
import { applyDayStarted, defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import { LIFE } from "@/game/life/content";
import { gameBlocked, gameBubbleText, gameMoodGain, gameOutcomeMood, pickGameOutcome, playGameSlot } from "@/game/life/logic";

const WIN = () => 0.1, NORMAL = () => 0.5, TROLL = () => 0.8, LOSE = () => 0.97;
const base = defaultCareer(1, 20 * 60, "student", SIM_CATALOG, "careful");
const at = (s, patch) => ({ ...s, players: { ...s.players, ...patch } });
const free = { minuteOfDay: 20 * 60, hospitalOpen: false, taskOpen: false };

describe("Chơi game logic", () => {
  it("config", () => {
    expect(LIFE.game_mood).toBe(8);
    expect(LIFE.game_energy).toBe(5);
    expect(LIFE.game_daily_full).toBe(2);
    expect(LIFE.game_extra_mood_multiplier).toBe(0.5);
    expect(LIFE.game_phases).toEqual(["noon", "evening", "night"]);
  });

  it("slot 1-3 mood and energy", () => {
    const s0 = at(base, { mood: 50, energy: 70 });
    const r1 = playGameSlot(s0, NORMAL);
    expect(r1.state.players.mood).toBe(58);
    expect(r1.state.players.energy).toBe(65);
    expect(r1.state.life.funSlotsToday).toBe(1);

    const r2 = playGameSlot(r1.state, NORMAL);
    expect(r2.state.players.mood).toBe(66);
    expect(r2.state.players.energy).toBe(60);
    expect(r2.state.life.funSlotsToday).toBe(2);

    const r3 = playGameSlot(r2.state, NORMAL);
    expect(r3.state.players.mood).toBe(70);
    expect(r3.state.players.energy).toBe(55);
    expect(r3.state.life.funSlotsToday).toBe(3);
  });

  it("clamp and optimistic floor", () => {
    const s = at(base, { mood: 98, energy: 70 });
    const r = playGameSlot(s, NORMAL);
    expect(r.state.players.mood).toBe(100);
    expect(r.moodDelta).toBe(2);
  });

  it("streak energy cost", () => {
    const s = { ...base, life: { ...base.life, workStreak: 3 } };
    const r = playGameSlot(at(s, { energy: 70 }), NORMAL);
    expect(r.state.players.energy).toBe(64);
  });

  it("blocked", () => {
    expect(gameBlocked(base, { minuteOfDay: 8 * 60, hospitalOpen: false, taskOpen: false })).toBe(LIFE.game_block_phase);
    expect(gameBlocked(base, { minuteOfDay: 12 * 60, hospitalOpen: false, taskOpen: false })).toBeNull();
    expect(gameBlocked(base, { minuteOfDay: 20 * 60, hospitalOpen: true, taskOpen: false })).toBe(LIFE.game_block_hospital);
    expect(gameBlocked(base, { minuteOfDay: 20 * 60, hospitalOpen: false, taskOpen: true })).toBe(LIFE.game_block_task);
    const low = at(base, { energy: 4 });
    expect(gameBlocked(low, free)).toBe(LIFE.game_block_energy);
  });

  it("grind avoids penalty with fun slots", () => {
    const day = 2;
    const lifeA = { ...base.life, workedToday: true, workStreak: 2, mealsToday: 3, funSlotsToday: 0 };
    const stateA = { ...base, players: { ...base.players, game_day: day, mood: 50 }, life: lifeA };
    const afterA = applyDayStarted(stateA, day + 1, 0, "student", SIM_CATALOG, { resolveMorning: false });
    expect(afterA.state.players.mood).toBeLessThan(50);

    const lifeB = { ...lifeA, funSlotsToday: 2 };
    const stateB = { ...stateA, life: lifeB };
    const afterB = applyDayStarted(stateB, day + 1, 0, "student", SIM_CATALOG, { resolveMorning: false });
    expect(afterB.state.players.mood).toBeGreaterThan(afterA.state.players.mood);
    expect(afterB.state.life.funSlotsToday).toBe(0);
  });

  it("midnight reset regression", () => {
    const s22 = at(base, { mood: 50, energy: 70 });
    const r = playGameSlot(s22, NORMAL);
    const d2 = applyDayStarted(r.state, 2, 0, "student", SIM_CATALOG, { resolveMorning: false });
    expect(d2.state.life.lastEndedDay).toBe(1);
    expect(d2.state.life.funSlotsToday).toBe(0);
  });

  it("gameMoodGain", () => {
    expect(gameMoodGain({ ...base, life: { ...base.life, funSlotsToday: 0 } })).toBe(8);
    expect(gameMoodGain({ ...base, life: { ...base.life, funSlotsToday: 1 } })).toBe(8);
    expect(gameMoodGain({ ...base, life: { ...base.life, funSlotsToday: 2 } })).toBe(4);
  });

  it("outcomes exist", () => {
    const ids = LIFE.game_outcomes.map(o => o.id);
    expect(ids).toEqual(["win_streak", "normal", "troll_team", "lose_streak"]);
    const total = LIFE.game_outcomes.reduce((s, o) => s + o.weight, 0);
    expect(total).toBe(100);
  });

  it("pickGameOutcome", () => {
    expect(pickGameOutcome(WIN).id).toBe("win_streak");
    expect(pickGameOutcome(NORMAL).id).toBe("normal");
    expect(pickGameOutcome(TROLL).id).toBe("troll_team");
    expect(pickGameOutcome(LOSE).id).toBe("lose_streak");
    expect(pickGameOutcome(() => 0).id).toBe("win_streak");
    expect(pickGameOutcome(() => 0.999999).id).toBe("lose_streak");
  });

  it("outcome mood base", () => {
    const s = at(base, { mood: 50, energy: 70 });
    expect(playGameSlot(s, WIN).state.players.mood - 50).toBe(12);
    expect(playGameSlot(s, NORMAL).state.players.mood - 50).toBe(8);
    expect(playGameSlot(s, TROLL).state.players.mood - 50).toBe(3);
    expect(playGameSlot(s, LOSE).state.players.mood - 50).toBe(-4);
  });

  it("halving after 2 slots", () => {
    const s = { ...base, life: { ...base.life, funSlotsToday: 2 } };
    expect(gameOutcomeMood(s, { id: "win_streak", label: "", weight: 1, mood_mult: 1.5 })).toBe(6);
    expect(gameOutcomeMood(s, { id: "normal", label: "", weight: 1, mood_mult: 1 })).toBe(4);
    expect(gameOutcomeMood(s, { id: "troll", label: "", weight: 1, mood_mult: 0.4 })).toBe(2);
    expect(gameOutcomeMood(s, { id: "lose", label: "", weight: 1, mood_delta: -4 })).toBe(-4);
  });

  it("lose clamps", () => {
    const s = at(base, { mood: 2 });
    const r = playGameSlot(s, LOSE);
    expect(r.state.players.mood).toBe(0);
  });

  it("invalid weight fallback", () => {
    const table = [
      { id: "a", label: "", weight: 0, mood_mult: 9 },
      { id: "b", label: "", weight: -5, mood_mult: 9 },
      { id: "c", label: "", weight: NaN, mood_mult: 9 },
      { id: "d", label: "", weight: 3, mood_mult: 2 },
    ];
    expect(pickGameOutcome(NORMAL, table).id).toBe("d");
    expect(pickGameOutcome(() => 0.5, []).id).toBe("normal");
  });

  it("bubble text", () => {
    expect(gameBubbleText({ id: "win", label: "X", weight: 1, mood_mult: 1 }, 12)).toBe("X · Tinh thần +12");
    expect(gameBubbleText({ id: "lose", label: "Y", weight: 1 }, -4)).toBe("Y · Tinh thần −4");
    expect(gameBubbleText({ id: "n", label: "Z", weight: 1 }, 0)).toBe("Z · Tinh thần +0");
  });
});
