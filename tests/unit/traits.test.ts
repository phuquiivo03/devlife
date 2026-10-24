import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIM_CATALOG } from "@/game/career/content";
import { applyStudy, defaultCareer, ensureTodayBoard } from "@/game/career/actions";
import { TRAIT_IDS } from "@/game/career/types";
import { jobEligibility, skillNameMap } from "@/game/jobs/logic";
import { grantedXp } from "@/game/knowledge/logic";
import { resolveHackathon, withFeed } from "@/game/life/events";
import { scaleWorkXp } from "@/game/life/furniture";
import { buyShopItem } from "@/game/life/store-buy";
import {
  applyActionStats,
  applyEventStats,
  applyLifeDayStart,
  crossWakingSlot,
  eatMeal,
  jobPay,
  resolveMorning,
  scaleXpForMood,
} from "@/game/life/logic";
import {
  extrovertHomeMood,
  foodPrice,
  introIndex,
  INTRO_SPIN_MS,
  isNightOwlHour,
  jobTimeScale,
  rollTrait,
  scaleShoppingMood,
  scaleTraitPay,
  scaleTraitXp,
  traitBugCount,
  traitDef,
  traitDetail,
  traitIconSrc,
} from "@/game/life/traits";
import { migrateSave } from "@/game/storage/migrate";
import { chooseBuild, chooseTicket, startTask } from "@/game/task-run/apply";
import { TASK_RUN } from "@/game/task-run/content";

function career(trait: (typeof TRAIT_IDS)[number], minute = 8 * 60) {
  return defaultCareer(1, minute, "student", SIM_CATALOG, trait);
}

function skillXp(state: ReturnType<typeof career>, id: string) {
  return state.player_skills.find((row) => row.skill_id === id)?.xp ?? 0;
}

describe("personality", () => {
  it("spins the creation icons for 1.5s and lands on the rolled trait", () => {
    expect(INTRO_SPIN_MS).toBe(1500);
    expect(career("optimist").players.introSeen).toBe(false);
    expect(introIndex(0, 1500, 5).stopped).toBe(false);
    expect(introIndex(1499, 1500, 5).stopped).toBe(false);
    expect(introIndex(1500, 1500, 5)).toEqual({ index: 5, stopped: true });
    const seen = new Set<number>();
    for (let elapsed = 0; elapsed < 1500; elapsed += 100) {
      seen.add(introIndex(elapsed, 1500, 5).index);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("rolls exactly one of the six traits", () => {
    expect(TRAIT_IDS).toHaveLength(6);
    expect(rollTrait(() => 0)).toBe("night_owl");
    expect(rollTrait(() => 0.999)).toBe("optimist");
    expect(new Set(TRAIT_IDS).size).toBe(6);
  });

  it("gives Cú đêm XP after 22:00 and before 06:00, and spends 10 energy at morning", () => {
    expect(isNightOwlHour(22 * 60)).toBe(true);
    expect(isNightOwlHour(2 * 60)).toBe(true);
    expect(isNightOwlHour(21 * 60)).toBe(false);
    expect(isNightOwlHour(6 * 60)).toBe(false);
    const day = career("careful", 22 * 60);
    const night = career("night_owl", 22 * 60);
    const early = career("night_owl", 2 * 60);
    const evening = career("night_owl", 21 * 60);
    expect(skillXp(applyStudy(night, "html", SIM_CATALOG).state, "frontend")).toBe(96);
    expect(skillXp(applyStudy(early, "html", SIM_CATALOG).state, "frontend")).toBe(96);
    expect(skillXp(applyStudy(evening, "html", SIM_CATALOG).state, "frontend")).toBe(80);
    expect(skillXp(applyStudy(day, "html", SIM_CATALOG).state, "frontend")).toBe(80);
    expect(resolveMorning(career("night_owl"), 2).state.players.energy).toBe(60);
    expect(resolveMorning(career("careful"), 2).state.players.energy).toBe(70);
  });

  it("raises study XP for Chăm chỉ, then the monitor, and decays mood faster", () => {
    const base = grantedXp(80, 1, "study", SIM_CATALOG.config);
    const diligent = career("diligent");
    expect(scaleTraitXp(base, diligent, "frontend", "study")).toBe(92);
    const monitored = { ...diligent, shop: { owned: ["monitor2"], pin: null } };
    expect(scaleWorkXp(scaleTraitXp(base, monitored, "frontend", "study"), monitored)).toBe(101);
    expect(skillXp(applyStudy(diligent, "html", SIM_CATALOG).state, "frontend")).toBe(92);
    expect(crossWakingSlot(diligent, 10 * 60).state.players.mood).toBeCloseTo(68.7, 5);
    expect(crossWakingSlot(career("careful"), 10 * 60).state.players.mood).toBe(69);
  });

  it("boosts soft XP and freelance pay for Hướng ngoại, and leaves the home penalty off", () => {
    const extro = career("extrovert");
    const plain = career("careful");
    expect(skillXp(applyStudy(extro, "comms", SIM_CATALOG).state, "soft")).toBe(87);
    expect(skillXp(applyStudy(plain, "comms", SIM_CATALOG).state, "soft")).toBe(70);
    expect(skillXp(applyStudy(extro, "html", SIM_CATALOG).state, "frontend")).toBe(80);
    expect(scaleTraitPay(jobPay(100_000, 1, 0), extro)).toBe(92_400);
    expect(scaleTraitPay(jobPay(100_000, 1, 0), plain)).toBe(88_000);
    expect(traitDetail(traitDef("extrovert"))).toBe(traitDef("extrovert").bonus);

    const home = (trait: "extrovert" | "careful") => {
      const first = applyLifeDayStart(career(trait), 2, "student", { resolveMorning: false });
      return applyLifeDayStart(first.state, 3, "student", { resolveMorning: false });
    };
    const stayed = home("extrovert");
    expect(stayed.state.life.homeDays).toBe(2);
    expect(stayed.state.players.mood).toBeCloseTo(home("careful").state.players.mood, 5);
    expect(extrovertHomeMood(false, "extrovert", 2)).toBe(0);
    expect(extrovertHomeMood(true, "extrovert", 2)).toBe(-5);
    expect(extrovertHomeMood(true, "extrovert", 1)).toBe(0);
    const out = {
      ...extro,
      life: { ...extro.life, funSlotsToday: 2 },
    };
    expect(applyLifeDayStart(out, 2, "student", { resolveMorning: false }).state.life.homeDays).toBe(0);
  });

  it("discounts food for Tiết kiệm and halves only a positive shopping mood", () => {
    const frugal = career("frugal");
    const plain = career("careful");
    const hungryFrugal = { ...frugal, players: { ...frugal.players, fullness: 20 } };
    const hungryPlain = { ...plain, players: { ...plain.players, fullness: 20 } };
    expect(foodPrice(8_000, frugal)).toBe(6_400);
    expect(foodPrice(25_000, frugal)).toBe(20_000);
    expect(eatMeal(hungryFrugal, "noodles").state.players.money).toBe(3_000_000 - 6_400);
    expect(eatMeal(hungryPlain, "noodles").state.players.money).toBe(3_000_000 - 8_000);
    expect(eatMeal(hungryFrugal, "noodles").state.players.health).toBe(67);
    expect(scaleShoppingMood(4, frugal)).toBe(2);
    expect(scaleShoppingMood(10, frugal)).toBe(5);
    expect(scaleShoppingMood(-4, frugal)).toBe(-4);
    expect(scaleShoppingMood(4, plain)).toBe(4);
    const bought = buyShopItem(plain, "plant");
    expect(bought.error).toBeNull();
    expect(bought.state.players.mood).toBe(74);
    const frugalBuy = buyShopItem(frugal, "plant");
    expect(frugalBuy.state.players.mood).toBe(72);
    const again = buyShopItem(frugalBuy.state, "fan");
    expect(again.state.players.mood).toBeCloseTo(73.2, 5);
    const juniorReady = (state: ReturnType<typeof career>) => ({
      ...state,
      players: { ...state.players, money: 30_000_000, reputation: 30 },
      player_skills: state.player_skills.map((skill, index) => (index === 0 ? { ...skill, level: 3 } : skill)),
    });
    const room = buyShopItem(juniorReady(plain), "room_junior");
    expect(room.error).toBeNull();
    expect(room.state.players.mood).toBe(80);
    const frugalRoom = buyShopItem(juniorReady(frugal), "room_junior");
    expect(frugalRoom.state.players.mood).toBe(75);
    const blocked = buyShopItem(plain, "room_junior");
    expect(blocked.error).not.toBeNull();
    expect(blocked.state.players.mood).toBe(plain.players.mood);
  });

  it("removes one bug for Cẩn thận without passing the formula floor, and lengthens the job", () => {
    expect(traitBugCount(3, career("careful"), TASK_RUN.bugs)).toBe(2);
    expect(traitBugCount(1, career("careful"), TASK_RUN.bugs)).toBe(TASK_RUN.bugs.min);
    expect(traitBugCount(3, career("optimist"), TASK_RUN.bugs)).toBe(3);
    expect(jobTimeScale(career("careful"))).toBe(1.1);
    expect(jobTimeScale(career("optimist"))).toBe(1);

    const start = career("careful");
    const board = ensureTodayBoard(start, 1, SIM_CATALOG);
    const names = skillNameMap(SIM_CATALOG.skills);
    const job = board.state.player_jobs.find((row) => {
      const template = SIM_CATALOG.jobTemplates.find((item) => item.id === row.template_id);
      if (!template || row.status !== "offered") return false;
      return jobEligibility(
        start.players,
        start.player_skills,
        template,
        SIM_CATALOG.jobTemplateRequirements.filter((req) => req.template_id === template.id),
        names,
      ).ok;
    });
    expect(job).toBeTruthy();
    if (!job) return;
    const template = SIM_CATALOG.jobTemplates.find((row) => row.id === job.template_id)!;
    const started = startTask(board.state, job.id, SIM_CATALOG);
    expect(started.state.player_jobs.find((row) => row.id === job.id)?.hours_required).toBe(
      Math.round(template.hours * 1.1 * 10) / 10,
    );
    const owl = startTask(
      { ...board.state, players: { ...board.state.players, trait: "night_owl" } },
      job.id,
      SIM_CATALOG,
    );
    expect(owl.state.player_jobs.find((row) => row.id === job.id)?.hours_required).toBe(template.hours);

    const ticket = chooseTicket(started.state, job.id, "wrong", SIM_CATALOG);
    const carefulBugs = chooseBuild(ticket.state, job.id, "rushed", SIM_CATALOG);
    const owlBugs = chooseBuild(
      { ...ticket.state, players: { ...ticket.state.players, trait: "night_owl" } },
      job.id,
      "rushed",
      SIM_CATALOG,
    );
    const carefulTotal = carefulBugs.state.player_jobs.find((row) => row.id === job.id)?.task_run?.bugs_total ?? 0;
    const owlTotal = owlBugs.state.player_jobs.find((row) => row.id === job.id)?.task_run?.bugs_total ?? 0;
    expect(carefulTotal).toBe(Math.max(TASK_RUN.bugs.min, owlTotal - 1));
  });

  it("holds Lạc quan mood at 20 for every source and trims study XP", () => {
    const optimist = {
      ...career("optimist"),
      players: { ...career("optimist").players, mood: 30 },
    };
    expect(applyActionStats(optimist, { mood: -25 }).state.players.mood).toBe(20);
    expect(applyEventStats(optimist, { mood: -25 }).state.players.mood).toBe(20);
    expect(scaleXpForMood(10, 20)).toBe(7);
    expect(skillXp(applyStudy(career("optimist"), "html", SIM_CATALOG).state, "frontend")).toBe(76);
  });

  it("leaves event XP, including a hackathon win, free of the trait", () => {
    const join = (trait: "night_owl" | "careful") => {
      const state = career(trait, 22 * 60);
      return withFeed(state, { ...state.feed, hackathonStart: 5, hackathonResolved: false });
    };
    const owl = resolveHackathon(join("night_owl"), 8, SIM_CATALOG, () => 0);
    const plain = resolveHackathon(join("careful"), 8, SIM_CATALOG, () => 0);
    expect(owl.state.player_skills).toEqual(plain.state.player_skills);
    expect(owl.state.players.money).toBe(plain.state.players.money);
  });

  it("rolls one trait for an old save, keeps a real v11 trait, and never rolls again", () => {
    const saved = migrateSave(
      {
        stage: "junior",
        totalMinutes: 480,
        career: {
          players: {
            money: 123_456,
            energy: 40,
            health: 80,
            mood: 55,
            reputation: 3,
            freelance_completed: 2,
            trait: "optimist",
          },
          player_skills: [{ skill_id: "frontend", level: 4, xp: 12 }],
          shop: { owned: ["plant"], pin: "fan" },
          feed: {
            notices: [
              {
                id: "salary-1-1",
                day: 10,
                minute: 360,
                severity: "info",
                icon: "icon_notif_salary.png",
                text: "Lương về.",
                read: false,
                cue: "sfx_salary",
              },
            ],
          },
        },
      },
      9,
      () => 0,
    );
    expect(saved.stage).toBe("junior");
    expect(saved.career.players.money).toBe(123_456);
    expect(saved.career.players.trait).toBe("night_owl");
    expect(saved.career.players.traitRolled).toBe(true);
    expect(saved.career.players.introSeen).toBe(true);
    expect(saved.career.players.freelance_completed).toBe(2);
    expect(saved.career.player_skills.find((row) => row.skill_id === "frontend")).toEqual({
      skill_id: "frontend",
      level: 4,
      xp: 12,
    });
    expect(saved.career.shop).toEqual({ owned: ["plant"], pin: "fan" });
    expect(saved.career.life.homeDays).toBe(0);
    expect(saved.career.feed.notices[0]?.cue).toBe("sfx_salary");

    const student = migrateSave(
      { stage: "junior", totalMinutes: 480, career: { players: { money: 50 } } },
      7,
      () => 0.999,
    );
    expect(student.stage).toBe("student");
    expect(student.career.players.money).toBe(50);
    expect(student.career.players.trait).toBe("optimist");
    expect(student.career.players.traitRolled).toBe(true);
    expect(student.career.shop.owned).toEqual([]);

    const kept = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: { players: { money: 9, trait: "night_owl" }, life: { homeDays: 3 } },
      },
      11,
      () => 0.999,
    );
    expect(kept.career.players.trait).toBe("night_owl");
    expect(kept.career.players.traitRolled).toBe(true);
    expect(kept.career.players.money).toBe(9);
    expect(kept.career.life.homeDays).toBe(3);

    const rerolled = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: { players: { money: 9, trait: "careful" }, life: { homeDays: 3 } },
      },
      11,
      () => 0,
    );
    expect(rerolled.career.players.trait).toBe("night_owl");
    expect(rerolled.career.players.traitRolled).toBe(true);
    expect(rerolled.career.life.homeDays).toBe(3);
    const again = migrateSave(rerolled, 12, () => 0.999);
    expect(again.career.players.trait).toBe("night_owl");
    expect(again.career.players.traitRolled).toBe(true);

    const marked = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: { players: { money: 9, trait: "careful", traitRolled: true } },
      },
      11,
      () => 0,
    );
    expect(marked.career.players.trait).toBe("careful");
    expect(marked.career.players.traitRolled).toBe(true);

    const pending = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: { players: { money: 10, trait: "frugal", traitRolled: true, introSeen: false } },
      },
      13,
      () => 0,
    );
    expect(pending.career.players.trait).toBe("frugal");
    expect(pending.career.players.introSeen).toBe(false);
    expect(pending.career.players.money).toBe(10);
  });

  it("uses the approved trait sheets at 16 and 32", () => {
    const art = join(process.cwd(), "public", "ui", "m5");
    for (const id of TRAIT_IDS) {
      const native = readFileSync(join(art, `icon_trait_${id}.png`));
      const doubled = readFileSync(join(art, `icon_trait_${id}_x2.png`));
      expect(native.readUInt32BE(16)).toBe(16);
      expect(native.readUInt32BE(20)).toBe(16);
      expect(doubled.readUInt32BE(16)).toBe(32);
      expect(doubled.readUInt32BE(20)).toBe(32);
      expect(native.length).toBeGreaterThan(200);
      expect(doubled.length).toBeGreaterThan(200);
    }
    expect(traitIconSrc("icon_trait_frugal.png")).toBe("/ui/m5/icon_trait_frugal_x2.png");
  });
});
