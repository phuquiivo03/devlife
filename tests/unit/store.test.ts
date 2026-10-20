import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SIM_CATALOG } from "@/game/career/content";
import { applyDayStarted, applyStudy, defaultCareer } from "@/game/career/actions";
import { grantedXp } from "@/game/knowledge/logic";
import { applyLifeDayStart, applySleepRest } from "@/game/life/logic";
import {
  blackFriday,
  buyBlock,
  cappedSum,
  furnitureSleepBonus,
  pinItem,
  pinProgressLine,
  roomOwned,
  scaleWorkXp,
  storePrice,
  storeItem,
} from "@/game/life/furniture";
import { openDiary, syncLifeSurface } from "@/game/life/events";
import { notSold, replacedItemIds, storeDrawEntries } from "@/game/life/placement";
import { buyShopItem } from "@/game/life/store-buy";
import { migrateSave } from "@/game/storage/migrate";
import { startTask } from "@/game/task-run/apply";
import type { CareerState } from "@/game/career/types";

function rich(state: CareerState, money: number): CareerState {
  return { ...state, players: { ...state.players, money } };
}

function withSkills(state: CareerState, level: number, count: number, reputation = state.players.reputation): CareerState {
  return {
    ...state,
    players: { ...state.players, reputation },
    player_skills: state.player_skills.map((skill, index) =>
      index < count ? { ...skill, level } : skill,
    ),
  };
}

describe("store catalog", () => {
  const start = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);

  it("uses the spec prices and a 10% Black Friday rate", () => {
    expect(storeItem("plant")?.price).toBe(150_000);
    expect(storeItem("fan")?.price).toBe(400_000);
    expect(storeItem("aircon")?.price).toBe(7_000_000);
    expect(storeItem("ergo_chair")?.price).toBe(3_500_000);
    expect(storeItem("monitor2")?.price).toBe(4_000_000);
    expect(storeItem("mattress")?.price).toBe(5_000_000);
    expect(storeItem("room_junior")?.price).toBe(25_000_000);
    expect(storeItem("room_senior")?.price).toBe(180_000_000);
    expect(blackFriday(1)).toBe(false);
    expect(blackFriday(306)).toBe(true);
    expect(storePrice(storeItem("plant")!, 306)).toBe(135_000);
    expect(storePrice(storeItem("room_junior")!, 306)).toBe(22_500_000);
  });

  it("gates rooms and the second monitor, and refuses a second buy", () => {
    expect(buyBlock(start, "room_junior")).toBe("Cần 1 kỹ năng cấp 3 và 30 uy tín.");
    const skilled = withSkills(start, 3, 1, 29);
    expect(buyBlock(skilled, "room_junior")).toBe("Cần 1 kỹ năng cấp 3 và 30 uy tín.");
    const unlocked = rich(withSkills(start, 3, 1, 30), 25_000_000);
    expect(buyBlock(unlocked, "room_junior")).toBeNull();
    expect(buyBlock(rich(start, 180_000_000), "room_senior")).toBe("Cần 2 kỹ năng cấp 8.");
    const senior = rich(withSkills(start, 8, 2, 0), 180_000_000);
    expect(buyBlock(senior, "room_senior")).toBeNull();
    expect(buyBlock(rich(start, 4_000_000), "monitor2")).toBeNull();

    const broke = buyShopItem(start, "plant");
    expect(broke.error).toBeNull();
    expect(broke.state.players.money).toBe(3_000_000 - 150_000);
    expect(buyShopItem(broke.state, "plant").error).toBe("Đã có.");
    expect(buyShopItem(broke.state, "plant").state.players.money).toBe(broke.state.players.money);
    expect(buyShopItem(start, "room_junior").error).not.toBeNull();
    expect(buyShopItem(start, "room_junior").state.players.money).toBe(3_000_000);
  });

  it("moves into a bought room and leaves the other room's bonus behind", () => {
    const junior = buyShopItem(rich(withSkills(start, 3, 1, 30), 25_000_000), "room_junior");
    expect(junior.moveTo).toBe("junior");
    expect(junior.state.players.stage).toBe("junior");
    expect(roomOwned(junior.state, "junior")).toBe(true);
    expect(roomOwned(junior.state, "senior")).toBe(false);
    const both = buyShopItem(
      rich(withSkills({ ...junior.state, players: { ...junior.state.players, stage: "junior" } }, 8, 2, 30), 180_000_000),
      "room_senior",
    );
    expect(both.state.players.stage).toBe("senior");
    expect(both.state.shop.owned).toEqual(["room_junior", "room_senior"]);
    const fan = buyShopItem(rich(both.state, 400_000), "fan");
    const air = buyShopItem(rich(fan.state, 7_000_000), "aircon");
    // v19: furniture applies wherever owned. Room bonuses only apply in their room.
    // Senior room: room_senior(20) + aircon(10) + fan(5) = 35
    expect(furnitureSleepBonus(air.state)).toBe(20 + 10 + 5);
    const back = { ...air.state, players: { ...air.state.players, stage: "junior" } };
    // Junior room: room_junior(10) + aircon(10) + fan(5) = 25
    expect(furnitureSleepBonus(back)).toBe(10 + 10 + 5);
    expect(cappedSum([20, 10, 5, 3], 3)).toBe(35);
  });

  it("applies daily mood and health, sleep energy, job energy, and work XP", () => {
    const planted = buyShopItem(start, "plant").state;
    const day = applyLifeDayStart(planted, 2, "student", { resolveMorning: false });
    expect(day.state.players.mood).toBeCloseTo(74.6, 5);
    const mattress = { ...start, shop: { owned: ["mattress"], pin: null } };
    const healed = applyLifeDayStart(mattress, 2, "student", { resolveMorning: false });
    expect(healed.state.players.health).toBe(66); // mattress applies when owned (v19)
    const rested = { ...planted, shop: { owned: ["fan"], pin: null }, players: { ...planted.players, energy: 10 } };
    expect(applySleepRest(rested, 1).state.players.energy).toBe(10 + 12.5 + 5);

    const board = applyDayStarted(start, 1, 8 * 60, "student", SIM_CATALOG, { resolveMorning: false });
    const offer = board.state.player_jobs.find((job) => job.status === "offered");
    const template = SIM_CATALOG.jobTemplates.find((row) => row.id === offer?.template_id);
    expect(template).toBeTruthy();
    const chair = { ...board.state, shop: { owned: ["ergo_chair"], pin: null } };
    const plain = startTask(board.state, offer!.id, SIM_CATALOG);
    const eased = startTask(chair, offer!.id, SIM_CATALOG);
    expect(plain.state.players.energy).toBeCloseTo(70 - template!.energy);
    expect(eased.state.players.energy).toBeCloseTo(70 - template!.energy * 0.9);

    const rows = SIM_CATALOG.studyActivityXp.filter((row) => row.activity_id === "html");
    const base = rows.reduce(
      (sum, row) => sum + grantedXp(row.xp, 1, "study", SIM_CATALOG.config),
      0,
    );
    const scaled = rows.reduce(
      (sum, row) => sum + scaleWorkXp(grantedXp(row.xp, 1, "study", SIM_CATALOG.config), { ...start, shop: { owned: ["monitor2"], pin: null } }),
      0,
    );
    const studied = applyStudy(start, "html", SIM_CATALOG);
    const monitored = applyStudy(
      { ...start, shop: { owned: ["monitor2"], pin: null } },
      "html",
      SIM_CATALOG,
    );
    const gained = (events: { type: string; amount?: number }[]) =>
      events.reduce((sum, event) => (event.type === "skillXpGained" ? sum + (event.amount ?? 0) : sum), 0);
    expect(scaled).toBeGreaterThan(base);
    expect(gained(studied.events)).toBe(base);
    expect(gained(monitored.events)).toBe(scaled);
  });

  it("pins one item, shows the percent, and notices once when it is affordable", () => {
    expect(pinProgressLine(start)).toBe("Chưa ghim món.");
    const pinned = pinItem(start, "plant");
    expect(pinProgressLine(pinned)).toBe("Cây xanh 100%.");
    const short = pinItem(rich(start, 75_000), "plant");
    expect(pinProgressLine(short)).toBe("Cây xanh 50%.");
    const diary = openDiary(short, SIM_CATALOG);
    expect(diary.feed.diary?.pin).toBe("Cây xanh 50%.");
    const noted = syncLifeSurface(pinned, 1, 8 * 60, false);
    expect(noted.state.feed.notices.some((notice) => notice.id === "pin-ready-plant")).toBe(true);
    expect(syncLifeSurface(noted.state, 1, 9 * 60, false).state.feed.notices.filter((notice) => notice.id === "pin-ready-plant")).toHaveLength(1);
    const sale = pinItem({ ...start, players: { ...start.players, game_day: 306, money: 135_000 } }, "aircon");
    expect(pinProgressLine(sale)).toBe("Máy lạnh 2%.");
  });

  it("wakes a pre-store junior or senior save in the student room", () => {
    for (const stage of ["junior", "senior"] as const) {
      const saved = migrateSave(
        {
          stage,
          totalMinutes: 480,
          career: {
            players: { money: 42 },
            player_skills: [{ skill_id: "frontend", level: 4, xp: 12 }],
          },
        },
        7,
      );
      expect(saved.stage).toBe("student");
      expect(saved.career.players.stage).toBe("student");
      expect(saved.career.players.money).toBe(42);
      expect(saved.career.player_skills.find((row) => row.skill_id === "frontend")).toEqual({
        skill_id: "frontend",
        level: 4,
        xp: 12,
      });
      expect(saved.career.shop).toEqual({ owned: [], pin: null });
      expect(roomOwned(saved.career, "junior")).toBe(false);
      expect(roomOwned(saved.career, "senior")).toBe(false);
    }
  });

  it("leaves a v7 student save in the student room with nothing owned", () => {
    const saved = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: {
          players: { money: 42 },
          player_skills: [{ skill_id: "frontend", level: 2, xp: 5 }],
        },
      },
      7,
    );
    expect(saved.stage).toBe("student");
    expect(saved.career.players.money).toBe(42);
    expect(saved.career.player_skills.find((row) => row.skill_id === "frontend")?.level).toBe(2);
    expect(saved.career.shop).toEqual({ owned: [], pin: null });
    expect(roomOwned(saved.career, "junior")).toBe(false);
  });

  it("keeps a room a version 8 save already bought", () => {
    const saved = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: { players: { money: 42 }, shop: { owned: [], pin: null } },
      },
      8,
    );
    expect(saved.stage).toBe("student");
    expect(saved.career.players.money).toBe(42);
    expect(saved.career.shop).toEqual({ owned: [], pin: null });
    const buyer = migrateSave(
      {
        stage: "junior",
        totalMinutes: 480,
        career: {
          players: { money: 100 },
          shop: { owned: ["plant", "room_junior"], pin: "fan" },
        },
      },
      8,
    );
    expect(buyer.stage).toBe("junior");
    expect(buyer.career.players.money).toBe(100);
    expect(buyer.career.shop).toEqual({ owned: ["plant", "room_junior"], pin: "fan" });
  });

  it("keeps a v8 save's money, skills, and progress and defaults notice cues", () => {
    const saved = migrateSave(
      {
        stage: "junior",
        totalMinutes: 20_000,
        showCharacter: true,
        career: {
          players: { money: 2_850_000, energy: 40, health: 70, mood: 66, freelance_completed: 2 },
          player_skills: [{ skill_id: "frontend", level: 3, xp: 12 }],
          player_jobs: [
            {
              id: "job-1",
              template_id: "landing",
              job_type: "freelance",
              status: "active",
              hours_required: 4,
              progress_hours: 2,
              pay: 500_000,
              offered_day: 3,
            },
          ],
          player_study_completions: [
            { activity_id: "html", skill_id: "frontend", xp_gained: 80, completed_day: 2 },
          ],
          shop: { owned: ["plant"], pin: "fan" },
          life: { workStreak: 2, paidSalaryKey: "1-1" },
          feed: {
            pity: 2,
            smallEventDay: 4,
            notices: [
              {
                id: "salary-1-1",
                day: 10,
                minute: 360,
                severity: "info",
                icon: "icon_notif_salary.png",
                text: "Lương về.",
                action: null,
                read: true,
              },
            ],
          },
        },
      },
      8,
      () => 0,
    );
    expect(saved.stage).toBe("junior");
    expect(saved.totalMinutes).toBe(20_000);
    expect(saved.career.players.money).toBe(2_850_000);
    expect(saved.career.players.trait).toBe("night_owl");
    expect(saved.career.players.traitRolled).toBe(true);
    expect(saved.career.life.homeDays).toBe(0);
    expect(saved.career.players.energy).toBe(40);
    expect(saved.career.players.freelance_completed).toBe(2);
    expect(saved.career.player_skills.find((row) => row.skill_id === "frontend")).toEqual({
      skill_id: "frontend",
      level: 3,
      xp: 12,
    });
    expect(saved.career.player_jobs[0]).toMatchObject({
      id: "job-1",
      status: "active",
      progress_hours: 2,
      pay: 500_000,
    });
    expect(saved.career.player_study_completions).toEqual([
      { activity_id: "html", skill_id: "frontend", xp_gained: 80, completed_day: 2 },
    ]);
    expect(saved.career.shop).toEqual({ owned: ["plant"], pin: "fan" });
    expect(saved.career.life.workStreak).toBe(2);
    expect(saved.career.life.paidSalaryKey).toBe("1-1");
    expect(saved.career.feed.pity).toBe(2);
    expect(saved.career.feed.smallEventDay).toBe(4);
    expect(saved.career.feed.notices).toEqual([
      {
        id: "salary-1-1",
        day: 10,
        minute: 360,
        severity: "info",
        icon: "icon_notif_salary.png",
        text: "Lương về.",
        action: null,
        actions: [],
        read: true,
        cue: null,
      },
    ]);
  });
});

describe("store placement", () => {
  it("replaces the listed sprites and shows items in all rooms", () => {
    // Note: NotSold requirement removed in v19 (removed notSold restrictions)
    // Now all items can appear in all rooms
    const owned = ["plant", "fan", "aircon", "ergo_chair", "monitor2", "mattress"];
    expect(notSold("fan", "student")).toBe(false);
    expect(notSold("mattress", "senior")).toBe(false);
    expect(replacedItemIds("student", owned)).toEqual(new Set(["student.floor_cushion", "student.mattress"]));
    const juniorBed = storeDrawEntries("junior", owned, 153).find((entry) => entry.key === "store:junior:mattress");
    expect(juniorBed?.bitmap).toBe("/ui/m5/item_mattress_junior.png");
    const monitor = storeDrawEntries("junior", owned, 153).find((entry) => entry.key === "store:junior:monitor2");
    expect(monitor).toMatchObject({ x: 255 - 22, y: 97 - 32, sortBaseline: 153 });
    expect(storeDrawEntries("senior", owned, null).some((entry) => entry.bitmap?.includes("item_mattress.png"))).toBe(false);
    expect(storeDrawEntries("student", owned, null).some((entry) => entry.bitmap === "/ui/m5/item_mattress.png")).toBe(false);
    const shadow = storeDrawEntries("student", ["plant"], null).find((entry) => entry.key.endsWith(":shadow"));
    expect(shadow).toMatchObject({
      bitmap: "/ui/m5/item_plant_shadow.png",
      x: Math.round(338 - Math.floor(30 / 2)),
      y: Math.round(132 - Math.floor(8 / 2) - 1),
    });
    for (const file of [
      "item_plant_shadow.png",
      "item_fan_shadow.png",
      "item_ergo_chair_shadow.png",
      "item_mattress_student_shadow.png",
      "item_mattress_junior_shadow.png",
    ]) {
      expect(existsSync(join(process.cwd(), "public/ui/m5", file))).toBe(true);
    }
  });
});
