import { describe, expect, it } from "vitest";
import { SIM_CATALOG } from "@/game/career/content";
import { defaultCareer } from "@/game/career/actions";
import { ensureFirstJobOffer, isJobOfferNotice } from "@/game/jobs/offers";
import { openingAfterReload } from "@/game/opening/flow";
import { migrateSave } from "@/game/storage/migrate";
import { useGameStore } from "@/game/state/store";
import { INTRO_WAKE_MINUTE } from "@/content/intro";

describe("day-1 opening flow", () => {
  it("marks an older save as already finished", () => {
    const saved = migrateSave(
      {
        stage: "student",
        totalMinutes: 5_000,
        career: { players: { money: 42, name: "Lan", introSeen: true, introVideoSeen: true } },
      },
      25,
      () => 0,
    );
    expect(saved.openingDone).toBe(true);
    expect(saved.openingStep).toBeNull();
    expect(saved.career.players.money).toBe(42);
    expect(saved.totalMinutes).toBe(5_000);
  });

  it("keeps a mid-flow step on version 26", () => {
    const saved = migrateSave(
      {
        stage: "student",
        totalMinutes: INTRO_WAKE_MINUTE,
        openingDone: false,
        openingStep: "bell",
        career: { players: { name: "Lan", introSeen: true, introVideoSeen: true } },
      },
      26,
      () => 0,
    );
    expect(saved.openingDone).toBe(false);
    expect(saved.openingStep).toBe("bell");
  });

  it("drops a step once the save is marked done", () => {
    const saved = migrateSave(
      {
        stage: "student",
        totalMinutes: INTRO_WAKE_MINUTE,
        openingDone: true,
        openingStep: "jobs",
        career: { players: { name: "Lan", introSeen: true, introVideoSeen: true } },
      },
      26,
      () => 0,
    );
    expect(saved.openingDone).toBe(true);
    expect(saved.openingStep).toBeNull();
  });

  it("posts one affordable freelance offer and does not stack another", () => {
    const start = defaultCareer(1, INTRO_WAKE_MINUTE, "student", SIM_CATALOG);
    const first = ensureFirstJobOffer(start, 1, INTRO_WAKE_MINUTE);
    const offers = first.feed.notices.filter(isJobOfferNotice);
    expect(offers).toHaveLength(1);
    expect(first.player_jobs.some((job) => job.status === "offered")).toBe(true);
    const again = ensureFirstJobOffer(first, 1, INTRO_WAKE_MINUTE);
    expect(again.feed.notices.filter(isJobOfferNotice)).toHaveLength(1);

    const accepted = {
      ...first,
      player_jobs: first.player_jobs.map((job) => ({ ...job, status: "active" as const })),
      feed: { ...first.feed, notices: [] },
    };
    const skipped = ensureFirstJobOffer(accepted, 1, INTRO_WAKE_MINUTE);
    expect(skipped.player_jobs).toHaveLength(accepted.player_jobs.length);
    expect(skipped.feed.notices.filter(isJobOfferNotice)).toHaveLength(0);
  });

  it("resumes on jobs when a reload already received the offer", () => {
    expect(openingAfterReload("bell", false, [{ status: "active" }])).toEqual({
      openingStep: "jobs",
      openingDone: false,
    });
    expect(openingAfterReload("study", false, [])).toEqual({
      openingStep: "study",
      openingDone: false,
    });
    expect(openingAfterReload("jobs", true, [{ status: "active" }])).toEqual({
      openingStep: null,
      openingDone: true,
    });
  });

  it("walks study, then the offer, then starting the job", () => {
    const career = defaultCareer(1, INTRO_WAKE_MINUTE, "student", SIM_CATALOG);
    useGameStore.setState({
      stage: "student",
      totalMinutes: INTRO_WAKE_MINUTE,
      career,
      openingDone: false,
      openingStep: "study",
      careerPanel: "study",
      notificationOpen: false,
      taskJobId: null,
      storeOpen: false,
    });

    const { openCareerPanel, setStoreOpen, buyCourse } = useGameStore.getState();
    openCareerPanel("skills");
    expect(useGameStore.getState().careerPanel).toBe("study");
    setStoreOpen(true);
    expect(useGameStore.getState().storeOpen).toBe(false);

    buyCourse("html");
    const afterStudy = useGameStore.getState();
    expect(afterStudy.openingStep).toBe("bell");
    expect(afterStudy.careerPanel).toBeNull();
    expect(afterStudy.career.player_study_completions.length).toBeGreaterThan(0);
    const notice = afterStudy.career.feed.notices.find(isJobOfferNotice);
    expect(notice).toBeTruthy();

    afterStudy.runNoticeAction("dismissNotice", notice);
    expect(useGameStore.getState().career.player_jobs.some((job) => job.status === "offered")).toBe(true);

    useGameStore.getState().runNoticeAction("acceptJob", notice);
    const accepted = useGameStore.getState();
    expect(accepted.openingStep).toBe("bell");
    expect(accepted.careerPanel).toBeNull();
    expect(accepted.career.player_jobs.some((job) => job.status === "active")).toBe(true);

    accepted.setNotificationOpen(false);
    expect(useGameStore.getState().openingStep).toBe("jobs");

    const jobId = useGameStore.getState().career.player_jobs.find((job) => job.status === "active")?.id;
    expect(jobId).toBeTruthy();
    useGameStore.getState().acceptJob(jobId!);
    const done = useGameStore.getState();
    expect(done.openingDone).toBe(true);
    expect(done.openingStep).toBeNull();
    expect(done.taskJobId).toBe(jobId);
  });

  it("does not start the highlight when the save is already done", () => {
    const career = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    useGameStore.setState({
      totalMinutes: 8 * 60,
      clockPaused: true,
      stage: "student",
      career,
      openingDone: true,
      openingStep: null,
    });
    useGameStore.getState().finishIntroVideo();
    const next = useGameStore.getState();
    expect(next.career.players.introVideoSeen).toBe(true);
    expect(next.openingDone).toBe(true);
    expect(next.openingStep).toBeNull();
  });
});
