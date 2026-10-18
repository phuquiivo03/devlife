import { describe, expect, it, vi } from "vitest";
import { SIM_CATALOG } from "@/game/career/content";
import { defaultCareer } from "@/game/career/actions";
import { slotCanRoll } from "@/game/life/events";
import { LIFE } from "@/game/life/content";
import {
  acceptJobFromNotice,
  deadlineDaysForTier,
  difficultyForTier,
  dismissNoticeById,
  tickJobOffers,
} from "@/game/jobs/offers";
import { migrateSave } from "@/game/storage/migrate";
import { useGameStore } from "@/game/state/store";

function offered(day = 1) {
  let state = defaultCareer(day, 8 * 60, "student", SIM_CATALOG);
  for (let i = 0; i < LIFE.job_notice_every_slots; i += 1) {
    state = tickJobOffers(state, day, 10 * 60);
  }
  return state;
}

describe("job offer notices", () => {
  it("reads the spacing, cap, expiry, and deadline numbers from config", () => {
    expect(LIFE.job_notice_every_slots).toBe(2);
    expect(LIFE.job_notice_pending_max).toBe(3);
    expect(LIFE.job_notice_expire_days).toBe(1);
    expect(LIFE.job_deadline_easy).toBe(2);
    expect(LIFE.job_deadline_mid).toBe(3);
    expect(LIFE.job_deadline_hard).toBe(4);
    expect(difficultyForTier(1)).toBe("easy");
    expect(difficultyForTier(2)).toBe("mid");
    expect(difficultyForTier(3)).toBe("hard");
    expect(deadlineDaysForTier(1)).toBe(2);
  });

  it("posts one job notice every two slots and keeps the cap at three", () => {
    let state = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    state = tickJobOffers(state, 1, 8 * 60);
    expect(state.feed.notices.filter((notice) => notice.payload?.jobId)).toHaveLength(0);
    expect(state.life.jobNoticeSlots).toBe(1);

    state = tickJobOffers(state, 1, 10 * 60);
    const first = state.feed.notices.filter((notice) => notice.actions?.some((button) => button.id === "acceptJob"));
    expect(first).toHaveLength(1);
    expect(first[0]?.actions).toEqual([
      { id: "acceptJob", label: "Nhận", variant: "primary" },
      { id: "dismissNotice", label: "Bỏ qua", variant: "secondary" },
    ]);
    expect(first[0]?.action).toBe("acceptJob");
    expect(first[0]?.payload).toEqual({ jobId: expect.any(String) });
    expect(first[0]?.title?.length).toBeGreaterThan(0);
    expect(first[0]?.detail).toMatch(/· (Dễ|Vừa|Khó) · /);
    expect(first[0]?.detail).toMatch(/\d+ ngày/);
    expect(first[0]?.text).toMatch(/· (Dễ|Vừa|Khó) · /);
    expect(first[0]?.text).toMatch(/hạn \d+ ngày/);
    const job = state.player_jobs.find((row) => row.id === first[0]?.payload?.jobId);
    expect(job?.status).toBe("offered");

    for (let i = 0; i < 12; i += 1) state = tickJobOffers(state, 1, 12 * 60);
    expect(state.feed.notices.filter((notice) => notice.actions?.some((button) => button.id === "acceptJob"))).toHaveLength(
      LIFE.job_notice_pending_max,
    );
  });

  it("drops an unaccepted notice after one day and accepts or dismisses the rest", () => {
    const state = offered(1);
    const notice = state.feed.notices.find((row) => row.payload?.jobId);
    expect(notice).toBeTruthy();
    const expired = tickJobOffers(state, 1 + LIFE.job_notice_expire_days, 8 * 60);
    expect(expired.feed.notices.some((row) => row.id === notice?.id)).toBe(false);
    expect(expired.player_jobs.find((job) => job.id === notice?.payload?.jobId)?.status).toBe("expired");

    const fresh = offered(3);
    const row = fresh.feed.notices.find((item) => item.payload?.jobId)!;
    const accepted = acceptJobFromNotice(fresh, row);
    expect(accepted.feed.notices.some((item) => item.id === row.id)).toBe(false);
    expect(accepted.player_jobs.find((job) => job.id === row.payload?.jobId)).toMatchObject({
      status: "active",
      accepted_day: 3,
    });
    expect(accepted.players.money).toBe(fresh.players.money);

    const again = offered(4);
    const skip = again.feed.notices.find((item) => item.payload?.jobId)!;
    const dismissed = dismissNoticeById(again, skip);
    expect(dismissed.feed.notices.some((item) => item.id === skip.id)).toBe(false);
    expect(dismissed.player_jobs.find((job) => job.id === skip.payload?.jobId)?.status).toBe("expired");
  });

  it("keeps eat-less old actions and the new ids through a version 16 load", () => {
    const saved = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: {
          players: { money: 42 },
          player_skills: [{ skill_id: "frontend", level: 4, xp: 9 }],
          life: { jobNoticeSlots: 9 },
          feed: {
            notices: [
              { id: "rent", text: "Trả trọ.", action: "payRent" },
              {
                id: "offer",
                text: "Landing page HTML",
                title: "Landing page HTML",
                detail: "Frontend · Dễ · 180.000đ · 2 ngày",
                action: "acceptJob",
                actions: ["acceptJob", "dismissNotice"],
                jobId: "job-1-landing-html-0",
              },
              { id: "nope", text: "Lạ.", action: "nope" },
            ],
          },
        },
      },
      16,
    );
    expect(saved.career.players.money).toBe(42);
    expect(saved.career.player_skills.find((skill) => skill.skill_id === "frontend")).toMatchObject({
      level: 4,
      xp: 9,
    });
    expect(saved.career.life.jobNoticeSlots).toBe(0);
    expect(saved.career.feed.notices.map((notice) => [notice.id, notice.actions, notice.payload ?? null])).toEqual([
      ["rent", [{ id: "payRent", label: "Trả trọ" }], null],
      [
        "offer",
        [
          { id: "acceptJob", label: "Nhận" },
          { id: "dismissNotice", label: "Bỏ qua" },
        ],
        { jobId: "job-1-landing-html-0" },
      ],
      ["nope", [], null],
    ]);
    expect(saved.career.feed.notices.find((notice) => notice.id === "offer")).toMatchObject({
      title: "Landing page HTML",
      detail: "Frontend · Dễ · 180.000đ · 2 ngày",
    });
  });
});

describe("onHour job offers", () => {
  it("keeps the offer when the same slot rolls a life event", () => {
    const minute = 10 * 60;
    expect(slotCanRoll(minute)).toBe(true);
    const base = defaultCareer(1, minute, "student", SIM_CATALOG);
    useGameStore.setState({
      career: { ...base, life: { ...base.life, jobNoticeSlots: LIFE.job_notice_every_slots - 1 } },
      taskJobId: null,
      totalMinutes: minute,
    });
    useGameStore.getState().onHour(10, minute);
    expect(
      useGameStore.getState().career.feed.notices.some((notice) => notice.actions?.some((button) => button.id === "acceptJob")),
    ).toBe(true);
  });
});

describe("runNoticeAction job ids", () => {
  it("accepts the named notice and warns on an unknown id without paying rent", () => {
    const seeded = offered(1);
    const notice = seeded.feed.notices.find((row) => row.payload?.jobId)!;
    useGameStore.setState({
      career: {
        ...seeded,
        players: { ...seeded.players, money: 3_000_000 },
        life: {
          ...seeded.life,
          rentIssuedKey: "1-1",
          paidRentKey: null,
        },
      },
    });
    useGameStore.getState().runNoticeAction("acceptJob", notice);
    const accepted = useGameStore.getState().career;
    expect(accepted.player_jobs.find((job) => job.id === notice.payload?.jobId)?.status).toBe("active");
    expect(accepted.players.money).toBe(3_000_000);
    expect(useGameStore.getState().taskJobId).toBeNull();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useGameStore.getState().runNoticeAction("nope" as "acceptJob");
    expect(useGameStore.getState().career.players.money).toBe(3_000_000);
    expect(useGameStore.getState().career.life.paidRentKey).toBeNull();
    expect(warn).toHaveBeenCalledWith('Unknown notice action "nope"');
    warn.mockRestore();
  });
});
