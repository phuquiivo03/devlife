import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import type { PlayerJob } from "@/game/career/types";
import { CUE_IDS } from "@/game/audio/cues";
import { parseManifest, resolveCueId } from "@/game/audio/manifest";
import { dialogCueKey, noticeCueKey, pickMomentCue } from "@/game/life/sounds";
import { LIFE } from "@/game/life/content";
import { LIFE_EVENTS } from "@/game/life/events-content";
import {
  bannerForDay,
  chooseLifeEvent,
  eligibleSmallEvents,
  flushDeferred,
  forceSmallEvent,
  hackathonWinChance,
  noteEmptyDay,
  diaryWhen,
  openDiary,
  payOutstandingRent,
  pickWeighted,
  queueLandlord,
  resolveHackathon,
  rollChance,
  rollSmallEvent,
  slotCanRoll,
  syncLifeSurface,
  withFeed,
  captureSnapshot,
} from "@/game/life/events";
import { eatMeal, monthKey, settleCalendarDay } from "@/game/life/logic";
import { buyShopItem } from "@/game/life/store-buy";
import { migrateSave } from "@/game/storage/migrate";

const ART = join(process.cwd(), "public", "ui", "m5");

const P2_SIZES: Record<string, [number, number]> = {
  "ui_dialog_frame.png": [24, 24],
  "ui_diary_page.png": [32, 32],
  "ui_banner.png": [480, 48],
  "ui_badge_unread.png": [10, 10],
  "ui_speech_bubble.png": [16, 16],
  "portrait_mom.png": [48, 48],
  "portrait_crush.png": [48, 48],
  "portrait_landlord.png": [48, 48],
  "portrait_client.png": [48, 48],
  "portrait_boss.png": [48, 48],
  "portrait_roommate.png": [48, 48],
  "portrait_headhunter.png": [48, 48],
  "portrait_coworker.png": [48, 48],
};

function pngSize(name: string): { w: number; h: number; bytes: number } {
  const buf = readFileSync(join(ART, name));
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), bytes: buf.length };
}

function start() {
  return defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
}

function withPending(id: string) {
  const state = start();
  return withFeed(state, { ...state.feed, pendingId: id });
}

function completedJob(pay: number): PlayerJob {
  return {
    id: "job-1",
    template_id: "landing",
    job_type: "freelance",
    status: "completed",
    hours_required: 2,
    progress_hours: 2,
    bugs: 0,
    pay,
    offered_day: 1,
    accepted_day: 1,
    deadline_day: 2,
    finished_day: 1,
    missed_days: 0,
    task_run: null,
  };
}

describe("life events", () => {
  it("rolls after the first slot, caps pity, and fires one event a day", () => {
    expect(rollChance(0)).toBeCloseTo(0.12, 5);
    expect(rollChance(3)).toBeCloseTo(0.27, 5);
    expect(rollChance(9)).toBeCloseTo(0.27, 5);
    expect(slotCanRoll(8 * 60)).toBe(false);
    expect(slotCanRoll(10 * 60)).toBe(true);

    let empty = start();
    for (let day = 1; day <= 4; day += 1) empty = noteEmptyDay(empty, day);
    expect(empty.feed.pity).toBe(3);
    expect(noteEmptyDay(empty, 4).feed.pity).toBe(3);

    const rolled = rollSmallEvent(empty, "morning", 6, 10 * 60, false, () => 0, SIM_CATALOG);
    expect(rolled.state.feed.pendingId).toBe("wifi_down");
    expect(rolled.state.feed.notices.find((notice) => notice.id === "event-6-wifi_down")?.cue).toBe("eventOpen");
    expect(rolled.state.feed.pity).toBe(0);
    expect(rolled.state.feed.smallEventDay).toBe(6);
    expect(rolled.state.feed.cooldowns.wifi_down).toBe(11);
    const again = rollSmallEvent(rolled.state, "noon", 6, 12 * 60, false, () => 0, SIM_CATALOG);
    expect(again.state).toBe(rolled.state);

    const held = noteEmptyDay(rolled.state, 6);
    expect(held.feed.pity).toBe(0);
    expect(eligibleSmallEvents(rolled.state, "morning", 7).map((event) => event.id)).not.toContain("wifi_down");
    expect(eligibleSmallEvents(rolled.state, "morning", 11).map((event) => event.id)).toContain("wifi_down");
  });

  it("weights a good event higher while mood is under 30 and respects stage and phase", () => {
    const wifi = LIFE_EVENTS.events.find((event) => event.id === "wifi_down");
    const crush = LIFE_EVENTS.events.find((event) => event.id === "crush");
    expect(wifi && crush).toBeTruthy();
    if (!wifi || !crush) return;
    expect(pickWeighted([wifi, crush], 70, () => 0.4)?.id).toBe("wifi_down");
    expect(pickWeighted([wifi, crush], 10, () => 0.4)?.id).toBe("crush");

    const morning = eligibleSmallEvents(start(), "morning", 1).map((event) => event.id);
    expect(morning).toContain("wifi_down");
    expect(morning).not.toContain("power_outage");
    expect(morning).not.toContain("prod_down");
    expect(morning).not.toContain("hackathon");
    expect(eligibleSmallEvents(start(), "morning", 5).map((event) => event.id)).toContain("hackathon");
    expect(eligibleSmallEvents(start(), "evening", 1).map((event) => event.id)).toContain("power_outage");
    expect(forceSmallEvent(start(), "morning", 1, 8 * 60, SIM_CATALOG).state.feed.pendingId).toBe("wifi_down");
  });

  it("defers a roll while the terminal is open, then flushes it", () => {
    const deferred = rollSmallEvent(start(), "morning", 1, 10 * 60, true, () => 0, SIM_CATALOG);
    expect(deferred.state.feed.deferredRoll).toBe(true);
    expect(deferred.state.feed.pendingId).toBeNull();
    const flushed = flushDeferred(deferred.state, "morning", 1, 10 * 60, () => 0, SIM_CATALOG);
    expect(flushed.state.feed.pendingId).toBe("wifi_down");
    expect(flushed.state.feed.deferredRoll).toBe(false);
  });

  it("adds event stats without diminishing and scales event XP with mood", () => {
    const moody = withFeed(start(), {
      ...start().feed,
      pendingId: "mom_call",
    });
    const heard = chooseLifeEvent(
      { ...moody, life: { ...moody.life, positiveMoodApplies: 5 } },
      "listen",
      SIM_CATALOG,
      () => 0,
    );
    expect(heard.state.players.mood).toBe(76);
    expect(heard.state.life.positiveMoodApplies).toBe(5);
    expect(heard.skipMinutes).toBe(120);

    const tired = {
      ...start(),
      players: { ...start().players, mood: 20 },
    };
    const reading = chooseLifeEvent(
      withFeed(tired, { ...tired.feed, pendingId: "wifi_down" }),
      "docs",
      SIM_CATALOG,
      () => 0,
    );
    expect(reading.state.players.mood).toBe(17);
    expect(reading.state.player_skills.find((skill) => skill.skill_id === "soft")?.xp).toBe(8);

    const client = withFeed(
      { ...start(), player_jobs: [completedJob(100_000)] },
      { ...start().feed, pendingId: "stiff_client" },
    );
    expect(chooseLifeEvent(client, "claim", SIM_CATALOG, () => 0).state.players.money).toBe(3_050_000);
  });

  it("keeps a buff notice and applies the buff immediately", () => {
    const base = start();
    const cooldowns = Object.fromEntries(LIFE_EVENTS.events.map((event) => [event.id, 99]));
    delete cooldowns.stackoverflow;
    const primed = withFeed(base, { ...base.feed, cooldowns });
    const rolled = rollSmallEvent(primed, "morning", 1, 10 * 60, false, () => 0, SIM_CATALOG);
    expect(rolled.bubble).toContain("Stack Overflow");
    expect(rolled.state.players.mood).toBe(76);
    expect(rolled.state.feed.nextBugDelta).toBe(-1);
    expect(rolled.state.feed.notices.some((notice) => notice.text.includes("Stack Overflow") && notice.cue === "eventOpen")).toBe(true);
    expect(rolled.state.feed.pendingId).toBeNull();
  });

  it("opens the landlord on debt day 3 and 7 without spending the daily slot", () => {
    const owing = start();
    const late = {
      ...owing,
      players: { ...owing.players, game_day: 29 },
      life: { ...owing.life, rentDebtDays: 3, rentIssuedKey: monthKey(29) },
    };
    const remind = queueLandlord(late, 29, 8 * 60, false);
    expect(remind.state.feed.pendingId).toBe("landlord_remind");
    expect(remind.state.feed.smallEventDay).toBeNull();
    expect(remind.state.feed.pity).toBe(0);
    expect(remind.state.feed.landlordTold).toBe(3);
    expect(queueLandlord(remind.state, 29, 8 * 60, false).state).toBe(remind.state);

    const knock = queueLandlord(
      { ...remind.state, life: { ...remind.state.life, rentDebtDays: 7 } },
      29,
      8 * 60,
      false,
    );
    expect(knock.state.feed.queuedStoryId ?? knock.state.feed.pendingId).toBe("landlord_knock");
    expect(remind.state.feed.notices.find((notice) => notice.id.includes("landlord_remind"))?.cue).toBe("eventOpen");
    expect(knock.state.feed.notices.find((notice) => notice.id.includes("landlord_knock"))?.cue).toBe("landlordKnock");

    const broke = {
      ...late,
      players: { ...late.players, money: 1_000 },
      feed: { ...late.feed, pendingId: "landlord_remind" },
    };
    const refused = chooseLifeEvent(broke, "pay", SIM_CATALOG, () => 0);
    expect(refused.state.feed.pendingId).toBe("landlord_remind");
    expect(refused.state.players.money).toBe(1_000);

    const funded = { ...late, feed: { ...late.feed, pendingId: "landlord_remind" } };
    const paid = chooseLifeEvent(funded, "pay", SIM_CATALOG, () => 0);
    expect(paid.state.players.money).toBe(200_000);
    expect(paid.state.life.rentDebtDays).toBe(0);
    expect(paid.state.life.paidRentKey).toBe(monthKey(29));
    expect(paid.state.feed.pendingId).toBeNull();
    expect(payOutstandingRent(broke).state.players.money).toBe(1_000);
  });

  it("resolves a Friday hackathon on the following Monday", () => {
    expect(hackathonWinChance(1)).toBeCloseTo(0.13, 5);
    const base = start();
    const joined = withFeed(base, { ...base.feed, hackathonStart: 5, hackathonResolved: false });
    expect(resolveHackathon(joined, 7, SIM_CATALOG, () => 0).state.feed.hackathonResolved).toBe(false);
    const won = resolveHackathon(joined, 8, SIM_CATALOG, () => 0);
    expect(won.state.players.money).toBe(23_000_000);
    expect(won.state.player_skills.find((skill) => skill.skill_id === "frontend")).toMatchObject({ level: 2, xp: 100 });
    const low = { ...joined, players: { ...joined.players, mood: 20 } };
    const scaled = resolveHackathon(low, 8, SIM_CATALOG, () => 0);
    expect(scaled.state.player_skills.find((skill) => skill.skill_id === "frontend")).toMatchObject({ level: 2, xp: 40 });
    const lost = resolveHackathon(joined, 8, SIM_CATALOG, () => 0.99);
    expect(lost.state.players.money).toBe(3_000_000);
    expect(lost.state.feed.notices.some((notice) => notice.text === "Hackathon không có giải.")).toBe(true);
  });

  it("writes diary deltas and a sick notice, and banners a holiday once", () => {
    const spent = start();
    const poorer = {
      ...spent,
      players: { ...spent.players, money: spent.players.money - 8_000, health: 67 },
    };
    const diary = openDiary(poorer, SIM_CATALOG);
    expect(diary.feed.diary?.money).toBe(-8_000);
    expect(diary.feed.diary?.earned).toBe(0);
    expect(diary.feed.diary?.spent).toBe(8_000);
    expect(diary.feed.diary?.remaining).toBe(poorer.players.money);
    expect(diary.feed.diary?.health).toBe(-3);
    expect(diary.feed.diary?.line).toBe(LIFE_EVENTS.diary_lines[0]);
    expect(diary.feed.diary?.sleptAt).toBeNull();
    const dated = openDiary(poorer, SIM_CATALOG, { day: 1, clock: "23:40" }).feed.diary;
    expect(dated?.sleptAt).toBe("23:40");
    expect(dated ? diaryWhen(dated) : "").toBe("Ngày lễ · T2 · ngủ lúc 23:40");

    const hungry = { ...start(), players: { ...start().players, fullness: 20 } };
    const eaten = eatMeal(hungry, "noodles").state;
    const afterFood = openDiary(eaten, SIM_CATALOG).feed.diary;
    expect(afterFood).toMatchObject({ food: 8_000, rent: 0, shop: 0, earned: 0, spent: 8_000, remaining: 3_000_000 - 8_000 });
    const cleared = openDiary(captureSnapshot(eaten, SIM_CATALOG), SIM_CATALOG).feed.diary;
    expect(cleared).toMatchObject({ food: 0, spent: 0, earned: 0, remaining: eaten.players.money });

    const planted = buyShopItem(start(), "plant").state;
    expect(openDiary(planted, SIM_CATALOG).feed.diary).toMatchObject({ shop: 150_000, food: 0, rent: 0, spent: 150_000 });

    const billed = settleCalendarDay(start(), 1, "student").state;
    expect(openDiary(billed, SIM_CATALOG).feed.diary).toMatchObject({
      rent: 2_800_000,
      food: 0,
      shop: 0,
      earned: 0,
      spent: 2_800_000,
      remaining: 200_000,
    });

    const sick = { ...start(), players: { ...start().players, health: 20 } };
    const noted = syncLifeSurface(sick, 1, 8 * 60, false);
    expect(noted.state.feed.notices.filter((notice) => notice.id === "sick-1")).toEqual([
      expect.objectContaining({ action: "sleep", text: `Sức khỏe dưới ${LIFE.sick_below}.` }),
    ]);
    expect(syncLifeSurface(noted.state, 1, 8 * 60, false).state.feed.notices.filter((notice) => notice.id === "sick-1")).toHaveLength(1);

    const banner = bannerForDay(start(), 1);
    expect(banner.label).toBe("Tết");
    expect(bannerForDay(banner.state, 1).label).toBeNull();
    expect(LIFE_EVENTS.banner_ms).toBe(3000);
    expect(LIFE_EVENTS.banner_enter_ms).toBe(480);
    expect(LIFE_EVENTS.banner_confetti_ms).toBe(1500);
    expect(LIFE_EVENTS.banner_spark_ms).toBe(600);
  });

  it("gives a version 6 save an empty feed", () => {
    const saved = migrateSave(
      { stage: "student", totalMinutes: 480, career: { players: { money: 42 } } },
      6,
    );
    expect(saved.career.feed.pity).toBe(0);
    expect(saved.career.feed.notices).toEqual([]);
    expect(saved.career.feed.pendingId).toBeNull();
    expect(saved.career.players.money).toBe(42);
    expect(saved.career.feed.purse).toEqual({ earned: 0, food: 0, rent: 0, shop: 0, other: 0 });

    const kept = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: {
          players: { money: 77, trait: "frugal", traitRolled: true, introSeen: true },
          player_skills: [{ skill_id: "frontend", level: 4, xp: 12 }],
          feed: { purse: { earned: 9, food: 1, rent: 2, shop: 3, other: 4 } },
        },
      },
      13,
    );
    expect(kept.career.players.money).toBe(77);
    expect(kept.career.players.trait).toBe("frugal");
    expect(kept.career.player_skills.find((skill) => skill.skill_id === "frontend")).toMatchObject({ level: 4, xp: 12 });
    expect(kept.career.feed.purse).toEqual({ earned: 0, food: 0, rent: 0, shop: 0, other: 0 });
  });
});

describe("life event art", () => {
  it("uses the approved native files for events and the store", () => {
    for (const [name, [w, h]] of Object.entries(P2_SIZES)) {
      expect(pngSize(name)).toMatchObject({ w, h });
    }
    for (const name of ["icon_notif_event.png", "emote_cough.png", "icon_severity_info.png"]) {
      expect(pngSize(name)).toMatchObject({ w: 16, h: 16 });
      expect(pngSize(name).bytes).toBeGreaterThan(150);
    }
    expect(pngSize("item_plant.png")).toMatchObject({ w: 22, h: 36 });
    expect(pngSize("ui_store_frame.png")).toMatchObject({ w: 24, h: 24 });
    expect(pngSize("ui_store_card.png")).toMatchObject({ w: 96, h: 120 });
    expect(pngSize("item_mattress_student.png").bytes).toBeGreaterThan(200);
    const names = readdirSync(ART);
    const doubled = names.filter((name) => name.includes("_x2"));
    expect(doubled.toSorted()).toEqual([
      "icon_trait_careful_x2.png",
      "icon_trait_diligent_x2.png",
      "icon_trait_extrovert_x2.png",
      "icon_trait_frugal_x2.png",
      "icon_trait_night_owl_x2.png",
      "icon_trait_optimist_x2.png",
    ]);
    expect(names).not.toContain("placement.json");
    expect(names).not.toContain("item_mattress.png");

    const polish = join(process.cwd(), "public", "ui", "m5_1");
    for (const [name, w, h] of [
      ["ui_banner_v2.png", 480, 64],
      ["ui_banner_v2_x2.png", 960, 128],
      ["fx_confetti.png", 256, 32],
      ["fx_confetti_x2.png", 512, 64],
      ["ui_window_notepad.png", 64, 40],
      ["ui_window_notepad_x2.png", 128, 80],
      ["icon_btn_food.png", 24, 24],
      ["icon_btn_food_x2.png", 48, 48],
      ["icon_hunger_full.png", 16, 16],
      ["icon_hunger_full_x2.png", 32, 32],
      ["icon_hunger_peckish.png", 16, 16],
      ["icon_hunger_peckish_x2.png", 32, 32],
      ["icon_hunger_hungry.png", 16, 16],
      ["icon_hunger_hungry_x2.png", 32, 32],
      ["icon_action_eat.png", 16, 16],
      ["icon_action_eat_x2.png", 32, 32],
    ] as const) {
      const buf = readFileSync(join(polish, name));
      expect(buf.readUInt32BE(16)).toBe(w);
      expect(buf.readUInt32BE(20)).toBe(h);
    }
  });

  it("resolves the life cues, including the store purchase", () => {
    expect(CUE_IDS.eventOpen[0]).toBe("sfx_event_open");
    const cues = parseManifest(JSON.parse(readFileSync(join(process.cwd(), "public/audio/manifest.json"), "utf8")));
    const ids = cues.map((cue) => cue.id);
    expect(resolveCueId(ids, CUE_IDS.eventOpen)).toBe("sfx_event_open");
    expect(resolveCueId(ids, CUE_IDS.storeBuy)).toBe("sfx_store_buy");
    expect(noticeCueKey({ id: "salary-1-2", severity: "info" })).toBe("salary");
    expect(noticeCueKey({ id: "sick-1", severity: "warn" })).toBe("sickCough");
    expect(noticeCueKey({ id: "event-3-landlord_knock", severity: "urgent" })).toBe("landlordKnock");
    expect(noticeCueKey({ id: "event-1-wifi_down", severity: "info" })).toBe("notifInfo");
    expect(noticeCueKey({ id: "rent-late-1-2-3", severity: "warn" })).toBe("notifWarn");
    expect(dialogCueKey("landlord_knock")).toBe("landlordKnock");
    expect(dialogCueKey("wifi_down")).toBe("eventOpen");
    expect(noticeCueKey({ id: "event-1-wifi_down", severity: "info", cue: "eventOpen" })).toBe("eventOpen");
    expect(noticeCueKey({ id: "custom", severity: "urgent", cue: "notifInfo" })).toBe("notifUrgent");
    expect(pickMomentCue(["notifInfo", "eventOpen"])).toBe("eventOpen");
    expect(pickMomentCue(["eventOpen", "eventOpen"])).toBe("eventOpen");
    expect(pickMomentCue(["landlordKnock", "landlordKnock"])).toBe("landlordKnock");
    expect(pickMomentCue(["salary"])).toBe("salary");
    expect(pickMomentCue(["sickCough"])).toBe("sickCough");
    expect(pickMomentCue(["notifWarn", "salary"])).toBe("salary");
    expect(pickMomentCue(["notifUrgent", "sickCough"])).toBe("sickCough");
    expect(pickMomentCue(["notifInfo", "notifWarn", "notifUrgent"])).toBe("notifUrgent");
    expect(pickMomentCue(["salary", "eventOpen"])).toBe("eventOpen");
    expect(pickMomentCue(["salary", "sickCough"])).toBe("sickCough");
    expect(pickMomentCue([])).toBeNull();
  });
});
