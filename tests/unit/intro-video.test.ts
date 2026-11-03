import { describe, expect, it } from "vitest";
import { INTRO_SUBTITLE, INTRO_WAKE_MINUTE } from "@/content/intro";
import { SIM_CATALOG } from "@/game/career/content";
import { defaultCareer } from "@/game/career/actions";
import { PERSIST_VERSION } from "@/game/config";
import { migrateSave } from "@/game/storage/migrate";
import { useGameStore } from "@/game/state/store";
import { MINUTES_PER_DAY } from "@/game/time";

describe("intro video save", () => {
  it("bumps the persist version and keeps the dream line in content", () => {
    expect(PERSIST_VERSION).toBe(25);
    expect(INTRO_SUBTITLE).toContain("Chỉ là giấc mơ thôi");
    expect(INTRO_WAKE_MINUTE).toBe(7 * 60);
  });

  it("starts a new career with the dream unwatched", () => {
    expect(defaultCareer(1, 8 * 60, "student", SIM_CATALOG).players.introVideoSeen).toBe(false);
  });

  it("marks an older save as already seen without moving the clock", () => {
    const saved = migrateSave(
      {
        stage: "student",
        totalMinutes: 5_000,
        career: { players: { money: 42, name: "Lan", introSeen: true } },
      },
      24,
      () => 0,
    );
    expect(saved.career.players.introVideoSeen).toBe(true);
    expect(saved.career.players.introSeen).toBe(true);
    expect(saved.career.players.name).toBe("Lan");
    expect(saved.career.players.money).toBe(42);
    expect(saved.totalMinutes).toBe(5_000);
  });

  it("keeps a version 25 flag that is still false", () => {
    const saved = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: {
          players: { money: 10, name: "Lan", introSeen: true, introVideoSeen: false },
        },
      },
      25,
      () => 0,
    );
    expect(saved.career.players.introVideoSeen).toBe(false);
    expect(saved.career.players.name).toBe("Lan");
  });

  it("wakes day 1 at 07:00 when the dream ends", () => {
    const career = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    useGameStore.setState({
      totalMinutes: 8 * 60,
      clockPaused: true,
      stage: "student",
      career,
    });
    useGameStore.getState().finishIntroVideo();
    const next = useGameStore.getState();
    expect(next.career.players.introVideoSeen).toBe(true);
    expect(next.totalMinutes).toBe(INTRO_WAKE_MINUTE);
    expect(next.career.players.game_day).toBe(1);
    expect(next.career.players.game_minute).toBe(INTRO_WAKE_MINUTE);
    expect(next.clockPaused).toBe(false);

    useGameStore.getState().finishIntroVideo();
    expect(useGameStore.getState().totalMinutes).toBe(INTRO_WAKE_MINUTE);
  });

  it("does not rewind a clock that already left day 1", () => {
    const career = defaultCareer(2, 8 * 60, "student", SIM_CATALOG);
    const totalMinutes = MINUTES_PER_DAY + 8 * 60;
    useGameStore.setState({
      totalMinutes,
      clockPaused: true,
      stage: "student",
      career: { ...career, players: { ...career.players, introVideoSeen: false } },
    });
    useGameStore.getState().finishIntroVideo();
    const next = useGameStore.getState();
    expect(next.totalMinutes).toBe(totalMinutes);
    expect(next.career.players.game_day).toBe(2);
    expect(next.career.players.introVideoSeen).toBe(true);
    expect(next.clockPaused).toBe(false);
  });
});
