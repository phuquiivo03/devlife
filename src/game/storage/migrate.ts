import { STAGES, type StageId } from "../config";
import { defaultCareer } from "../career/actions";
import { SIM_CATALOG } from "../career/content";
import {
  LOCAL_PLAYER_ID,
  SKILL_IDS,
  type CareerState,
  type JobStatus,
  type JobType,
  type PlayerEvent,
  type PlayerJob,
  type PlayerSkill,
  type PlayerStudyCompletion,
  type PlayerUnlock,
  type SkillId,
  type TaskBuildChoice,
  type TaskOutcome,
  type TaskRun,
  type TaskStep,
  type LifeState,
  type NoticeActionButton,
  type NoticeActionId,
  NOTICE_ACTION_DEFAULT_LABEL,
  type TaskTicketChoice,
} from "../career/types";
import type { Loadout } from "../types";
import { snapshot, totalMinutesFromPersisted } from "../time";
import { clampEnergy } from "../vitals/logic";
import { LIFE } from "../life/content";
import { normalizeShop } from "../life/furniture";
import { defaultLife } from "../life/logic";
import { isTraitId, MIGRATION_TRAIT, rollTrait } from "../life/traits";
import { defaultFeed } from "../life/events";
import { emptyPurse } from "../life/purse";
import type { LifeDiary, LifeFeed, LifeNotice, LifeSnapshot, NoticeSeverity } from "../career/types";

export type PersistedSave = {
  stage: StageId;
  loadouts: Record<StageId, Loadout>;
  showCharacter: boolean;
  totalMinutes: number;
  career: CareerState;
};

const JOB_STATUSES: readonly JobStatus[] = [
  "offered",
  "active",
  "completed",
  "failed",
  "expired",
  "quit",
  "fired",
];

function emptyLoadouts(): Record<StageId, Loadout> {
  return { student: {}, junior: {}, senior: {} };
}

function isStage(value: unknown): value is StageId {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}

function isSkillId(value: unknown): value is SkillId {
  return typeof value === "string" && (SKILL_IDS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSkills(value: unknown): PlayerSkill[] {
  const rows = Array.isArray(value) ? value : [];
  const byId = new Map<SkillId, PlayerSkill>();
  for (const row of rows) {
    if (!isRecord(row) || !isSkillId(row.skill_id)) continue;
    const level = Number(row.level);
    const xp = Number(row.xp);
    byId.set(row.skill_id, {
      skill_id: row.skill_id,
      level: Number.isFinite(level) ? Math.max(1, Math.min(10, Math.floor(level))) : 1,
      xp: Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0,
    });
  }
  return SKILL_IDS.map(
    (skill_id) => byId.get(skill_id) ?? { skill_id, level: 1, xp: 0 },
  );
}

function deadlineDaysForTier(tier: number): number {
  if (tier <= 1) return LIFE.job_deadline_easy;
  if (tier === 2) return LIFE.job_deadline_mid;
  return LIFE.job_deadline_hard;
}

/** Offered and in-progress jobs become accepted. Deadline is counted from `today`. */
function acceptOpenJobs(jobs: readonly PlayerJob[], today: number): PlayerJob[] {
  return jobs.map((job) => {
    if (job.status !== "offered" && job.status !== "active") return job;
    const template = SIM_CATALOG.jobTemplates.find((row) => row.id === job.template_id);
    const days = deadlineDaysForTier(template?.tier ?? 2);
    return {
      ...job,
      status: "active",
      accepted_day: job.accepted_day ?? today,
      deadline_day: today + days,
    };
  });
}

function normalizeJobs(value: unknown): PlayerJob[] {
  if (!Array.isArray(value)) return [];
  const jobs: PlayerJob[] = [];
  for (const row of value) {
    if (!isRecord(row)) continue;
    if (typeof row.id !== "string" || typeof row.template_id !== "string") continue;
    const status = JOB_STATUSES.find((item) => item === row.status);
    const jobType: JobType = row.job_type === "remote" ? "remote" : "freelance";
    if (!status) continue;
    jobs.push({
      id: row.id,
      template_id: row.template_id,
      job_type: jobType,
      status,
      hours_required: decimal(row.hours_required),
      progress_hours: num(row.progress_hours),
      bugs: num(row.bugs),
      pay: num(row.pay),
      offered_day: Math.max(1, num(row.offered_day, 1)),
      accepted_day: nullableNum(row.accepted_day),
      deadline_day: nullableNum(row.deadline_day),
      finished_day: nullableNum(row.finished_day),
      missed_days: num(row.missed_days),
      task_run: normalizeTaskRun(row.task_run),
    });
  }
  return jobs;
}

function normalizeCompletions(value: unknown): PlayerStudyCompletion[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, PlayerStudyCompletion>();
  for (const row of value) {
    if (!isRecord(row) || typeof row.activity_id !== "string" || row.activity_id.length === 0) {
      continue;
    }
    if (!isSkillId(row.skill_id)) continue;
    byId.set(row.activity_id, {
      activity_id: row.activity_id,
      skill_id: row.skill_id,
      xp_gained: num(row.xp_gained),
      completed_day: Math.max(1, num(row.completed_day, 1)),
    });
  }
  return [...byId.values()];
}

function normalizeUnlocks(value: unknown): PlayerUnlock[] {
  if (!Array.isArray(value)) return [];
  const unlocks: PlayerUnlock[] = [];
  for (const row of value) {
    if (!isRecord(row) || typeof row.milestone_id !== "string") continue;
    unlocks.push({
      milestone_id: row.milestone_id,
      reached_day: Math.max(1, num(row.reached_day, 1)),
    });
  }
  return unlocks;
}

function normalizeEvents(value: unknown): PlayerEvent[] {
  if (!Array.isArray(value)) return [];
  const events: PlayerEvent[] = [];
  for (const row of value) {
    if (!isRecord(row) || typeof row.id !== "string" || typeof row.type !== "string") {
      continue;
    }
    events.push({
      id: row.id,
      type: row.type,
      day: Math.max(1, num(row.day, 1)),
      payload: isRecord(row.payload) ? row.payload : {},
    });
  }
  return events;
}

const TASK_STEPS: readonly TaskStep[] = ["ticket", "build", "test", "result"];
const TICKET_CHOICES: readonly TaskTicketChoice[] = ["correct", "wrong", "ask"];
const BUILD_CHOICES: readonly TaskBuildChoice[] = ["careful", "rushed"];

function normalizeTaskRun(value: unknown): TaskRun | null {
  if (!isRecord(value)) return null;
  const step = TASK_STEPS.find((item) => item === value.step);
  if (!step) return null;
  const ticket = TICKET_CHOICES.find((item) => item === value.ticket) ?? null;
  const build = BUILD_CHOICES.find((item) => item === value.build) ?? null;
  const outcome: TaskOutcome | null =
    value.outcome === "success" || value.outcome === "fail" ? value.outcome : null;
  return {
    step,
    seed: num(value.seed),
    ticket,
    build,
    event_id: typeof value.event_id === "string" ? value.event_id : null,
    bugs_total: num(value.bugs_total),
    bugs_caught: num(value.bugs_caught),
    retries: num(value.retries),
    outcome,
    time_bonus_sec: Number.isFinite(Number(value.time_bonus_sec))
      ? Math.trunc(Number(value.time_bonus_sec))
      : 0,
  };
}

function decimal(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 10) / 10;
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function nullableNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed);
}

export function careerFromUnknown(
  value: unknown,
  day: number,
  minuteOfDay: number,
  stage: string,
): CareerState {
  const fresh = defaultCareer(day, minuteOfDay, stage, SIM_CATALOG);
  if (!isRecord(value)) return fresh;
  const players = isRecord(value.players) ? value.players : {};
  return {
    players: {
      id: typeof players.id === "string" ? players.id : LOCAL_PLAYER_ID,
      stage,
      game_day: day,
      game_minute: minuteOfDay,
      money: Number.isFinite(Number(players.money))
        ? Math.trunc(Number(players.money))
        : fresh.players.money,
      energy: Number.isFinite(Number(players.energy))
        ? clampEnergy(Number(players.energy), SIM_CATALOG.config.energy_max)
        : fresh.players.energy,
      health: Number.isFinite(Number(players.health))
        ? clampEnergy(Number(players.health), LIFE.stat_max)
        : fresh.players.health,
      mood: Number.isFinite(Number(players.mood))
        ? clampEnergy(Number(players.mood), LIFE.stat_max)
        : fresh.players.mood,
      reputation: num(players.reputation, fresh.players.reputation),
      freelance_completed: num(players.freelance_completed),
      trait: isTraitId(players.trait) ? players.trait : MIGRATION_TRAIT,
      traitRolled: players.traitRolled === true,
      introSeen: players.introSeen === true,
    },
    player_skills: normalizeSkills(value.player_skills),
    player_study_completions: normalizeCompletions(value.player_study_completions),
    player_jobs: normalizeJobs(value.player_jobs),
    player_unlocks: normalizeUnlocks(value.player_unlocks),
    player_events: normalizeEvents(value.player_events),
    life: normalizeLife(value.life, day),
    shop: normalizeShop(value.shop),
    feed: normalizeFeed(value.feed, day, {
      money: Number.isFinite(Number(players.money)) ? Math.trunc(Number(players.money)) : fresh.players.money,
      health: Number.isFinite(Number(players.health)) ? Number(players.health) : fresh.players.health,
      mood: Number.isFinite(Number(players.mood)) ? Number(players.mood) : fresh.players.mood,
      energy: Number.isFinite(Number(players.energy)) ? Number(players.energy) : fresh.players.energy,
    }),
  };
}

function normalizeLife(value: unknown, day: number): LifeState {
  const fresh = defaultLife(day);
  if (!isRecord(value)) return fresh;
  return {
    mealsToday: num(value.mealsToday),
    positiveMoodApplies: num(value.positiveMoodApplies),
    workStreak: num(value.workStreak),
    workedToday: value.workedToday === true,
    funSlotsToday: num(value.funSlotsToday),
    lateSlotsToday: num(value.lateSlotsToday),
    moodPenaltyTomorrow: finite(value.moodPenaltyTomorrow),
    rentDebtDays: num(value.rentDebtDays),
    rentIssuedKey: strOrNull(value.rentIssuedKey),
    paidRentKey: strOrNull(value.paidRentKey),
    paidUtilitiesKey: strOrNull(value.paidUtilitiesKey),
    paidSalaryKey: strOrNull(value.paidSalaryKey),
    burnoutDay: value.burnoutDay == null ? null : Math.max(1, num(value.burnoutDay, 1)),
    lastEndedDay: value.lastEndedDay == null ? null : num(value.lastEndedDay),
    settledDay: value.settledDay == null ? null : num(value.settledDay),
    morningResolvedDay: value.morningResolvedDay == null ? null : num(value.morningResolvedDay),
    wakeBudget: value.wakeBudget == null ? fresh.wakeBudget : Math.max(1, num(value.wakeBudget, fresh.wakeBudget)),
    suppressEndOfDayUntil:
      value.suppressEndOfDayUntil == null ? null : num(value.suppressEndOfDayUntil),
    homeDays: num(value.homeDays),
    slotsSinceMeal: Math.max(0, num(value.slotsSinceMeal)),
    jobNoticeSlots: Math.max(0, num(value.jobNoticeSlots)),
  };
}

function normalizeFeed(
  value: unknown,
  day: number,
  vitals: { money: number; health: number; mood: number; energy: number },
): LifeFeed {
  const fresh = defaultFeed({ day, money: vitals.money, xp: 0, health: vitals.health, mood: vitals.mood, energy: vitals.energy });
  if (!isRecord(value)) return fresh;
  const snapshot = isRecord(value.snapshot) ? normalizeSnapshot(value.snapshot, fresh.snapshot) : fresh.snapshot;
  return {
    pity: Math.max(0, Math.min(3, num(value.pity))),
    pityCountedDay: value.pityCountedDay == null ? null : num(value.pityCountedDay),
    smallEventDay: value.smallEventDay == null ? null : num(value.smallEventDay),
    cooldowns: numberMap(value.cooldowns),
    flags: stringList(value.flags),
    pendingId: strOrNull(value.pendingId),
    queuedStoryId: strOrNull(value.queuedStoryId),
    deferredRoll: value.deferredRoll === true,
    notices: normalizeNotices(value.notices),
    nextBugDelta: signed(value.nextBugDelta),
    hackathonStart: value.hackathonStart == null ? null : num(value.hackathonStart),
    hackathonResolved: value.hackathonResolved === true,
    snapshot,
    diary: normalizeDiary(value.diary, vitals.money),
    purse: normalizePurse(value.purse),
    bannerDay: value.bannerDay == null ? null : num(value.bannerDay),
    landlordTold: num(value.landlordTold),
    sickOpen: value.sickOpen === true,
    burnoutOpen: value.burnoutOpen === true,
    storeAsked: value.storeAsked === true,
  };
}

function signed(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function normalizeSnapshot(value: Record<string, unknown>, fresh: LifeSnapshot): LifeSnapshot {
  return {
    day: value.day == null ? fresh.day : num(value.day, fresh.day),
    money: Number.isFinite(Number(value.money)) ? Math.trunc(Number(value.money)) : fresh.money,
    xp: num(value.xp),
    health: Number.isFinite(Number(value.health)) ? Number(value.health) : fresh.health,
    mood: Number.isFinite(Number(value.mood)) ? Number(value.mood) : fresh.mood,
    energy: Number.isFinite(Number(value.energy)) ? Number(value.energy) : fresh.energy,
  };
}

function normalizePurse(value: unknown) {
  const fresh = emptyPurse();
  if (!isRecord(value)) return fresh;
  return {
    earned: Math.max(0, signed(value.earned)),
    food: Math.max(0, signed(value.food)),
    rent: Math.max(0, signed(value.rent)),
    shop: Math.max(0, signed(value.shop)),
    other: Math.max(0, signed(value.other)),
  };
}

function normalizeDiary(value: unknown, remainingFallback: number): LifeDiary | null {
  if (!isRecord(value)) return null;
  const money = signed(value.money);
  return {
    day: num(value.day, 1),
    money,
    xp: signed(value.xp),
    health: Number(value.health) || 0,
    mood: Number(value.mood) || 0,
    energy: Number(value.energy) || 0,
    line: typeof value.line === "string" ? value.line : "",
    pin: typeof value.pin === "string" ? value.pin : "Chưa ghim món.",
    earned: value.earned == null ? Math.max(0, money) : Math.max(0, signed(value.earned)),
    spent: value.spent == null ? Math.max(0, -money) : Math.max(0, signed(value.spent)),
    food: Math.max(0, signed(value.food)),
    rent: Math.max(0, signed(value.rent)),
    shop: Math.max(0, signed(value.shop)),
    remaining: value.remaining == null ? remainingFallback : signed(value.remaining),
    sleptDay: value.sleptDay == null ? null : num(value.sleptDay, 1),
    sleptAt: typeof value.sleptAt === "string" && /^\d{2}:\d{2}$/.test(value.sleptAt) ? value.sleptAt : null,
  };
}

const NOTICE_ACTIONS: readonly NoticeActionId[] = [
  "payRent",
  "viewJobs",
  "openStore",
  "eat",
  "sleep",
  "acceptJob",
  "dismissNotice",
  "openJobs",
];

function noticeActionOf(value: unknown): NoticeActionId | null {
  return NOTICE_ACTIONS.find((action) => action === value) ?? null;
}

function noticeButton(value: unknown): NoticeActionButton | null {
  if (typeof value === "string") {
    const id = noticeActionOf(value);
    return id ? { id, label: NOTICE_ACTION_DEFAULT_LABEL[id] } : null;
  }
  if (!isRecord(value)) return null;
  const id = noticeActionOf(value.id);
  if (!id) return null;
  const label = typeof value.label === "string" && value.label.trim().length > 0 ? value.label : NOTICE_ACTION_DEFAULT_LABEL[id];
  const button: NoticeActionButton = { id, label };
  if (typeof value.icon === "string" && value.icon.length > 0) button.icon = value.icon;
  if (value.variant === "primary" || value.variant === "secondary") button.variant = value.variant;
  return button;
}

function normalizeNotices(value: unknown): LifeNotice[] {
  if (!Array.isArray(value)) return [];
  const notices: LifeNotice[] = [];
  for (const row of value) {
    if (!isRecord(row) || typeof row.id !== "string" || typeof row.text !== "string") continue;
    const severity: NoticeSeverity = row.severity === "warn" || row.severity === "urgent" ? row.severity : "info";
    const legacy = noticeActionOf(row.action);
    const listed = Array.isArray(row.actions) ? row.actions.flatMap((item) => {
      const parsed = noticeButton(item);
      return parsed ? [parsed] : [];
    }) : [];
    const actions = listed.length > 0 ? listed : legacy ? [noticeButton(legacy)!] : [];
    const payloadRecord = isRecord(row.payload) ? row.payload : null;
    const jobId =
      payloadRecord && typeof payloadRecord.jobId === "string" && payloadRecord.jobId.length > 0
        ? payloadRecord.jobId
        : typeof row.jobId === "string" && row.jobId.length > 0
          ? row.jobId
          : null;
    const notice: LifeNotice = {
      id: row.id,
      day: num(row.day, 1),
      minute: num(row.minute),
      severity,
      icon: typeof row.icon === "string" ? row.icon : "icon_notif_event.png",
      text: row.text,
      action: actions[0]?.id ?? legacy,
      actions,
      read: row.read === true,
      cue: typeof row.cue === "string" && row.cue.length > 0 ? row.cue : null,
    };
    if (typeof row.title === "string" && row.title.length > 0) notice.title = row.title;
    if (typeof row.detail === "string" && row.detail.length > 0) notice.detail = row.detail;
    if (jobId) notice.payload = { jobId };
    notices.push(notice);
  }
  return notices;
}

function numberMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (Number.isFinite(Number(entry))) out[key] = Math.trunc(Number(entry));
  }
  return out;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function finite(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Versions before 3 keep the room and the clock, and gain a fresh career
 * document. Version 3 keeps the career tables. Versions before 4 have no
 * course history, so every course is still uncompleted. Versions before 5
 * have no task_run; normalize stores null. Versions before 6 have no health,
 * mood, or life counters; those gain the defaults. Versions before 7 have no
 * event feed; normalize adds an empty one. Versions before 8 have no store,
 * so they own nothing and wake in the student room. Junior and senior rooms
 * are bought in the store. Versions before 9 have notices without `cue`;
 * those cues stay null. Versions before 11 have no rolled trait, so home-day
 * counts start at 0. Version 12 rolls one trait when the save is not already
 * marked `traitRolled`. A version 11 trait other than Cẩn thận is kept. A
 * version 11 Cẩn thận is rolled once and then marked. Version 13 marks
 * `introSeen` so an older save does not open the creation popup. Version 14
 * starts `feed.purse` empty. Version 15 sets `life.slotsSinceMeal` to 0.
 * Version 16 clears `sleptDay` and `sleptAt` on an older diary.
 * Version 17 turns a legacy `action` into `{ id, label }`, folds `jobId` into
 * `payload`, and starts `life.jobNoticeSlots` at 0.
 * Money, skills, and progress are kept. See docs/systems/save.md.
 */
export function migrateSave(
  persisted: unknown,
  version: number,
  random: () => number = Math.random,
): PersistedSave {
  const prev = isRecord(persisted) ? persisted : {};
  let stage = isStage(prev.stage) ? prev.stage : "student";
  if (version < 8 && stage !== "student") stage = "student";
  const loadouts = isRecord(prev.loadouts)
    ? {
        student: isRecord(prev.loadouts.student)
          ? (prev.loadouts.student as Loadout)
          : {},
        junior: isRecord(prev.loadouts.junior) ? (prev.loadouts.junior as Loadout) : {},
        senior: isRecord(prev.loadouts.senior) ? (prev.loadouts.senior as Loadout) : {},
      }
    : emptyLoadouts();
  const showCharacter = typeof prev.showCharacter === "boolean" ? prev.showCharacter : true;
  const totalMinutes = totalMinutesFromPersisted(prev.totalMinutes, version);
  const snap = snapshot(totalMinutes);
  let career =
    version >= 3
      ? careerFromUnknown(prev.career, snap.day, snap.minuteOfDay, stage)
      : defaultCareer(snap.day, snap.minuteOfDay, stage, SIM_CATALOG);
  if (version < 4) {
    career = { ...career, player_study_completions: [] };
  }
  if (version < 9) {
    career = {
      ...career,
      feed: {
        ...career.feed,
        notices: career.feed.notices.map((notice) => ({ ...notice, cue: null })),
      },
    };
  }
  if (version < 12) {
    const rawCareer = isRecord(prev.career) ? prev.career : {};
    const rawPlayers = isRecord(rawCareer.players) ? rawCareer.players : {};
    const storedTrait = isTraitId(rawPlayers.trait) ? rawPlayers.trait : null;
    const alreadyRolled = rawPlayers.traitRolled === true && storedTrait != null;
    const keptV11 = version >= 11 && storedTrait != null && storedTrait !== MIGRATION_TRAIT;
    const trait = alreadyRolled || keptV11 ? (storedTrait ?? career.players.trait) : rollTrait(random);
    career = {
      ...career,
      players: { ...career.players, trait, traitRolled: true },
      life: version < 11 ? { ...career.life, homeDays: 0 } : career.life,
    };
  }
  if (version < 13) {
    career = {
      ...career,
      players: { ...career.players, introSeen: true },
    };
  }
  if (version < 14) {
    career = { ...career, feed: { ...career.feed, purse: emptyPurse() } };
  }
  if (version < 15) {
    career = { ...career, life: { ...career.life, slotsSinceMeal: 0 } };
  }
  if (version < 16 && career.feed.diary) {
    career = {
      ...career,
      feed: { ...career.feed, diary: { ...career.feed.diary, sleptDay: null, sleptAt: null } },
    };
  }
  if (version < 17) {
    career = {
      ...career,
      life: { ...career.life, jobNoticeSlots: 0 },
    };
  }
  if (version < 18) {
    career = { ...career, player_jobs: acceptOpenJobs(career.player_jobs, snap.day) };
  }
  if (version < 19) {
    // v19: furniture placement overhaul - overlay items can appear in all rooms, replacement items use loadouts across rooms
    // No save-breaking data migration needed as placement data is in JSON files
    // Ensure shop normalization handles owned items properly
  }

  return {
    stage,
    loadouts,
    showCharacter,
    totalMinutes,
    career: {
      ...career,
      players: { ...career.players, stage, game_day: snap.day, game_minute: snap.minuteOfDay },
    },
  };
}
