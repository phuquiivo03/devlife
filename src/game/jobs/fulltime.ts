import fulltimeConfig from "../../../config/fulltime.json";
import positionsConfig from "../../../config/fulltime_positions.json";
import { SIM_CATALOG } from "../career/content";
import {
  NOTICE_ACTION_DEFAULT_LABEL,
  type CareerState,
  type CurrentEmployment,
  type EmploymentApplication,
  type EmploymentState,
  type FulltimePosition,
  type LevelTier,
  type LifeNotice,
  type PlayerJob,
  type PositionStack,
} from "../career/types";
import type { GameEvent } from "../events/types";
import { LIFE } from "../life/content";
import { LIFE_EVENTS } from "../life/events-content";
import { applyEventStats, calendar, monthKey } from "../life/logic";
import { notePurse } from "../life/purse";
import { traitOf } from "../life/traits";
import { applyMoney } from "../vitals/logic";
import { formatVnd } from "@/lib/format-currency";
import { deadlineDaysForTier, offerJob, shuffleSeeded, skillNameMap } from "./logic";

/** Numbers for the full-time system. Copy lives in the notices/panels, not here. */
export const FULLTIME = fulltimeConfig as {
  base_salary: Record<LevelTier, number>;
  board_min: number;
  board_max: number;
  apply_max_pending: number;
  apply_energy: number;
  offer_expire_days: number;
  pass: {
    fit_cap: number;
    skill_weight: number;
    rep_weight: number;
    base: number;
    exp: number;
    min: number;
    max: number;
    extrovert_bonus: number;
  };
  salary_factor_base: number;
  salary_factor_step: number;
  salary_fit_cap: number;
  tasks: {
    counts: Record<LevelTier, [number, number]>;
    empty_day_chance: number;
    tiers: Record<LevelTier, number[]>;
  };
  late_penalty_pct: number;
  late_reputation: number;
  strike_warn: number;
  strike_fire: number;
  strike_clean_gain: number;
  fire_mood: number;
  fire_reputation: number;
  block_days: number;
  payday_mood: number;
  freelance_notice_divisor: number;
};

export const POSITIONS = positionsConfig as unknown as FulltimePosition[];

export const TIER_LABEL: Record<LevelTier, string> = {
  intern: "Intern",
  junior: "Junior",
  middle: "Middle",
  senior: "Senior",
};

export const STACK_LABEL: Record<PositionStack, string> = {
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Fullstack",
  devops: "DevOps",
};

const STACK_SKILLS: Record<PositionStack, string[]> = {
  frontend: ["frontend"],
  backend: ["backend"],
  fullstack: ["frontend", "backend"],
  devops: ["devops"],
};

export const FT_JOB_ICON = "icon_notif_job.png";
const REMIND_ICON = "icon_notif_deadline.png";

export function defaultEmployment(): EmploymentState {
  return {
    current: null,
    applications: [],
    board: null,
    blockedCompanies: {},
    pendingPayouts: [],
    fired: null,
    lastPaydayKey: null,
  };
}

export function employmentOf(state: CareerState): EmploymentState {
  return state.employment ?? defaultEmployment();
}

export function positionById(id: string): FulltimePosition | null {
  return POSITIONS.find((row) => row.id === id) ?? null;
}

/** Monday of `day`'s week. Day 1 of a save is a Monday. */
export function weekStartOf(day: number): number {
  return Math.max(1, day - calendar(day).weekday);
}

/**
 * Deterministic 0..1 from an integer seed. A single LCG step maps linear
 * seeds (day × k) to a near-linear ramp, so roll the seed through three
 * xorshift+LCG rounds first — neighbouring days must look independent.
 * Ends with `>>> 0`: `^` works on signed int32, so the last round can leave
 * a negative value that would poison every `<` comparison downstream.
 */
function hashUnit(seed: number): number {
  let state = seed >>> 0;
  if (state === 0) state = 1;
  for (let round = 0; round < 3; round += 1) {
    state ^= state >>> 15;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    state ^= state >>> 13;
  }
  return (state >>> 0) / 4294967296;
}

function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pushNotice(notices: LifeNotice[], notice: LifeNotice): LifeNotice[] {
  if (notices.some((row) => row.id === notice.id)) return notices;
  const next = [...notices, notice];
  const cap = LIFE_EVENTS.notice_cap;
  return next.length > cap ? next.slice(next.length - cap) : next;
}

/* ------------------------------------------------------------------ fit */

/** fit = avg(skill ratios) × 0.8 + reputation ratio × 0.2, each capped at 1.2. */
export function fitFor(state: CareerState, position: FulltimePosition): number {
  const { pass } = FULLTIME;
  let sum = 0;
  for (const req of position.requirements) {
    const level = state.player_skills.find((row) => row.skill_id === req.skill_id)?.level ?? 1;
    sum += Math.min(pass.fit_cap, level / Math.max(1, req.min_level));
  }
  const avg = sum / Math.max(1, position.requirements.length);
  const repRatio =
    position.min_reputation > 0
      ? Math.min(pass.fit_cap, state.players.reputation / position.min_reputation)
      : 1;
  return avg * pass.skill_weight + repRatio * pass.rep_weight;
}

/** p = clamp(0.03, 0.9, 0.85 × fit³); Hướng ngoại adds +5%. */
export function passChanceFor(fit: number, state: CareerState): number {
  const { pass } = FULLTIME;
  const raw = Math.pow(fit, pass.exp) * pass.base;
  const clamped = Math.min(pass.max, Math.max(pass.min, raw));
  if (traitOf(state) === "extrovert") {
    return Math.min(0.95, clamped + pass.extrovert_bonus);
  }
  return clamped;
}

/** Word form of the pass chance. No percentages on the card, by design. */
export function chanceLabel(p: number): "Cao" | "Vừa" | "Thấp" | "Rất thấp" {
  if (p >= 0.7) return "Cao";
  if (p >= 0.4) return "Vừa";
  if (p >= 0.15) return "Thấp";
  return "Rất thấp";
}

/** Salary locked in when the offer is accepted: base × (0.9 + 0.1 × min(1.5, fit)). */
export function quotedSalaryFor(position: FulltimePosition, fit: number): number {
  const base = position.base_salary ?? FULLTIME.base_salary[position.level_tier];
  const capped = Math.min(FULLTIME.salary_fit_cap, fit);
  return Math.round(base * (FULLTIME.salary_factor_base + FULLTIME.salary_factor_step * capped));
}

export function baseSalaryOf(position: FulltimePosition): number {
  return position.base_salary ?? FULLTIME.base_salary[position.level_tier];
}

export function positionRequirementLines(position: FulltimePosition): string[] {
  const names = skillNameMap(SIM_CATALOG.skills);
  return position.requirements.map(
    (req) => `Cần ${names.get(req.skill_id) ?? req.skill_id} cấp ${req.min_level}`,
  );
}

/** Skills (and reputation) the player is still missing for `position`. */
export function missingRequirementLines(state: CareerState, position: FulltimePosition): string[] {
  const names = skillNameMap(SIM_CATALOG.skills);
  const missing: string[] = [];
  for (const req of position.requirements) {
    const level = state.player_skills.find((row) => row.skill_id === req.skill_id)?.level ?? 1;
    if (level < req.min_level) {
      missing.push(`Cần ${names.get(req.skill_id) ?? req.skill_id} cấp ${req.min_level} (đang ${level})`);
    }
  }
  if (position.min_reputation > 0 && state.players.reputation < position.min_reputation) {
    missing.push(`Cần ${position.min_reputation} uy tín (đang ${Math.floor(state.players.reputation)})`);
  }
  return missing;
}

/** While employed, freelance invites space out by this factor. */
export function freelanceNoticeEvery(state: CareerState): number {
  return employmentOf(state).current
    ? LIFE.job_notice_every_slots * FULLTIME.freelance_notice_divisor
    : LIFE.job_notice_every_slots;
}

/* ------------------------------------------------------- weekly board */

function pruneBlocked(employment: EmploymentState, day: number): EmploymentState {
  let changed = false;
  const next: Record<string, number> = {};
  for (const [company, until] of Object.entries(employment.blockedCompanies)) {
    if (until > day) next[company] = until;
    else changed = true;
  }
  return changed ? { ...employment, blockedCompanies: next } : employment;
}

/** Monday (or first load of the week) rerolls 4–6 positions, blocked companies out. */
export function ensureWeeklyBoard(employment: EmploymentState, day: number): EmploymentState {
  const week = weekStartOf(day);
  if (employment.board && employment.board.weekStart === week && employment.board.positionIds.length > 0) {
    return employment;
  }
  const blocked = employment.blockedCompanies;
  const pool = POSITIONS.filter((position) => {
    const until = blocked[position.company];
    return until == null || until <= day;
  });
  const shuffled = shuffleSeeded(pool, week);
  const spread = FULLTIME.board_max - FULLTIME.board_min + 1;
  const count = Math.min(
    shuffled.length,
    FULLTIME.board_min + Math.floor(hashUnit(Math.imul(week, 7) + 11) * spread),
  );
  let picked = shuffled.slice(0, count);
  // Always keep one intern/junior spot reachable for a fresh save.
  if (picked.length > 0 && !picked.some((row) => row.level_tier === "intern" || row.level_tier === "junior")) {
    const easy = shuffled.find((row) => row.level_tier === "intern" || row.level_tier === "junior");
    if (easy) picked = [...picked.slice(0, -1), easy];
  }
  return { ...pruneBlocked(employment, day), board: { weekStart: week, positionIds: picked.map((row) => row.id) } };
}

export function boardPositionsOf(employment: EmploymentState): FulltimePosition[] {
  const ids = employment.board?.positionIds ?? [];
  return ids
    .map((id) => positionById(id))
    .filter((row): row is FulltimePosition => row != null);
}

/* ------------------------------------------------------------- apply */

export type ApplyResult = { state: CareerState; error: string | null };

export function pendingApplications(employment: EmploymentState): EmploymentApplication[] {
  return employment.applications.filter((row) => !row.notified);
}

export function applyToPosition(state: CareerState, positionId: string): ApplyResult {
  const position = positionById(positionId);
  if (!position) return { state, error: "Không tìm thấy vị trí" };
  const employment = employmentOf(state);
  const day = state.players.game_day;

  const blockedUntil = employment.blockedCompanies[position.company];
  if (blockedUntil != null && blockedUntil > day) {
    return { state, error: `${position.company} chưa nhận hồ sơ (khoá ${blockedUntil - day} ngày nữa)` };
  }
  const week = weekStartOf(day);
  if (employment.applications.some((row) => row.positionId === positionId && row.weekStart === week)) {
    return { state, error: "Vị trí này đã nộp đơn trong tuần" };
  }
  if (pendingApplications(employment).length >= FULLTIME.apply_max_pending) {
    return { state, error: `Tối đa ${FULLTIME.apply_max_pending} đơn đang chờ` };
  }
  if (state.players.energy < FULLTIME.apply_energy) {
    return { state, error: `Cần ${FULLTIME.apply_energy} năng lượng để nộp đơn` };
  }

  const spent = applyEventStats(state, { energy: -FULLTIME.apply_energy });
  const fit = fitFor(state, position);
  const chance = passChanceFor(fit, state);
  const roll = hashUnit(hashString(positionId) ^ Math.imul(day, 2654435761));
  const application: EmploymentApplication = {
    id: `app-${day}-${positionId}`,
    positionId,
    appliedDay: day,
    weekStart: week,
    passed: roll < chance,
    notified: false,
    quotedSalary: quotedSalaryFor(position, fit),
    outcome: "waiting",
  };
  return {
    state: {
      ...spent.state,
      employment: {
        ...employmentOf(spent.state),
        applications: [...employment.applications, application],
      },
    },
    error: null,
  };
}

/** Day-start: applications from an earlier day reveal their rolled result. */
export function resolveApplicationsDay(state: CareerState, day: number, minute: number): CareerState {
  const employment = employmentOf(state);
  if (!state.feed || !employment.applications.some((row) => !row.notified && row.appliedDay < day)) {
    return state;
  }
  let notices = state.feed.notices;
  const applications = employment.applications.map((app): EmploymentApplication => {
    if (app.notified || app.appliedDay >= day) return app;
    const position = positionById(app.positionId);
    if (!position) return { ...app, notified: true, outcome: "expired" };
    if (app.passed) {
      notices = pushNotice(notices, {
        id: `ft-offer-${app.id}`,
        day,
        minute,
        severity: "info",
        icon: FT_JOB_ICON,
        title: `${position.title} · ${position.company}`,
        text: `🎉 ${position.company} mời bạn vào vị trí ${position.title}, lương ${formatVnd(app.quotedSalary)}/tháng`,
        detail: `${STACK_LABEL[position.stack]} · ${TIER_LABEL[position.level_tier]} · ${formatVnd(app.quotedSalary)}/tháng`,
        action: "acceptPosition",
        actions: [
          { id: "acceptPosition", label: NOTICE_ACTION_DEFAULT_LABEL.acceptPosition, variant: "primary" },
          { id: "declinePosition", label: NOTICE_ACTION_DEFAULT_LABEL.declinePosition, variant: "secondary" },
        ],
        payload: { applicationId: app.id },
        read: false,
      });
    } else {
      const missing = missingRequirementLines(state, position);
      const hint = missing.length > 0 ? missing.join(" · ") : "Ứng viên khác phù hợp hơn, thử lại tuần sau";
      notices = pushNotice(notices, {
        id: `ft-reject-${app.id}`,
        day,
        minute,
        severity: "info",
        icon: FT_JOB_ICON,
        title: position.company,
        text: `Rất tiếc, ${position.company} chưa phù hợp`,
        detail: hint,
        action: "dismissNotice",
        actions: [{ id: "dismissNotice", label: "Đóng" }],
        read: false,
      });
    }
    return { ...app, notified: true };
  });
  return { ...state, employment: { ...employment, applications }, feed: { ...state.feed, notices } };
}

/** Offer notices older than `offer_expire_days` close and their application expires. */
export function expireApplicationOffers(state: CareerState, day: number): CareerState {
  const employment = employmentOf(state);
  if (!state.feed || employment.applications.length === 0) return state;
  const drop = new Set<string>();
  const expired = new Set<string>();
  for (const notice of state.feed.notices) {
    const appId = notice.payload?.applicationId;
    if (!appId || !notice.actions?.some((button) => button.id === "acceptPosition")) continue;
    if (day < notice.day + FULLTIME.offer_expire_days) continue;
    drop.add(notice.id);
    expired.add(appId);
  }
  if (drop.size === 0) return state;
  return {
    ...state,
    employment: {
      ...employment,
      applications: employment.applications.map((app) =>
        expired.has(app.id) && app.outcome === "waiting" ? { ...app, outcome: "expired" } : app,
      ),
    },
    feed: { ...state.feed, notices: state.feed.notices.filter((notice) => !drop.has(notice.id)) },
  };
}

/* ---------------------------------------------------- accept / decline */

function companyJobIds(state: CareerState, statuses: PlayerJob["status"][]): Set<string> {
  return new Set(
    state.player_jobs
      .filter((job) => job.source === "company" && statuses.includes(job.status))
      .map((job) => job.id),
  );
}

/** Leave the current job for another one: old tasks cancel, accrued pay waits for payday. */
function quitForAnotherJob(state: CareerState, day: number): CareerState {
  const employment = employmentOf(state);
  const current = employment.current;
  if (!current) return state;
  const accrued = Math.max(
    0,
    Math.round((current.salary * current.daysWorkedThisMonth) / LIFE.days_per_month) - current.monthPenalty,
  );
  const pendingPayouts =
    accrued > 0
      ? [...employment.pendingPayouts, { company: current.company, amount: accrued, monthKey: monthKey(day) }]
      : employment.pendingPayouts;
  return {
    ...state,
    player_jobs: state.player_jobs.map((job) =>
      job.source === "company" && (job.status === "offered" || job.status === "active")
        ? { ...job, status: "quit" as const }
        : job,
    ),
    employment: { ...employment, current: null, pendingPayouts },
  };
}

export function acceptApplication(state: CareerState, applicationId: string): ApplyResult {
  const employment = employmentOf(state);
  const app = employment.applications.find((row) => row.id === applicationId);
  if (!app) return { state, error: "Không tìm thấy đơn" };
  if (!app.passed || app.outcome !== "waiting") return { state, error: "Đơn này đã đóng" };
  const position = positionById(app.positionId);
  if (!position) return { state, error: "Không tìm thấy vị trí" };
  const open = (state.feed?.notices ?? []).some(
    (notice) => notice.payload?.applicationId === applicationId &&
      notice.actions?.some((button) => button.id === "acceptPosition"),
  );
  if (!open) return { state, error: "Đơn đã hết hạn" };

  const day = state.players.game_day;
  let next = quitForAnotherJob(state, day);
  const current: CurrentEmployment = {
    positionId: position.id,
    company: position.company,
    title: position.title,
    salary: app.quotedSalary,
    fit: fitFor(state, position),
    startDay: day,
    strikes: 0,
    monthPenalty: 0,
    daysWorkedThisMonth: 1,
    countedMonthKey: monthKey(day),
    strikesThisMonth: 0,
    totalDays: 1,
    lateTasks: 0,
  };
  const notices = (next.feed?.notices ?? []).filter(
    (notice) => notice.payload?.applicationId !== applicationId,
  );
  next = {
    ...next,
    employment: {
      ...employmentOf(next),
      current,
      applications: employmentOf(next).applications.map((row) =>
        row.id === applicationId ? { ...row, outcome: "accepted" as const } : row,
      ),
    },
    feed: next.feed ? { ...next.feed, notices } : next.feed,
  };
  return { state: next, error: null };
}

export function declineApplication(state: CareerState, applicationId: string): CareerState {
  const employment = employmentOf(state);
  const notices = (state.feed?.notices ?? []).filter(
    (notice) => notice.payload?.applicationId !== applicationId,
  );
  return {
    ...state,
    employment: {
      ...employment,
      applications: employment.applications.map((app) =>
        app.id === applicationId && app.outcome === "waiting" ? { ...app, outcome: "declined" as const } : app,
      ),
    },
    feed: state.feed ? { ...state.feed, notices } : state.feed,
  };
}

/* ------------------------------------------------------ company tasks */

/** Freelance templates that read as this position's stack and tier band. */
export function companyTaskTemplates(catalog = SIM_CATALOG, position: FulltimePosition) {
  const tiers = FULLTIME.tasks.tiers[position.level_tier] ?? [1];
  const skills = new Set(STACK_SKILLS[position.stack] ?? []);
  return catalog.jobTemplates.filter(
    (template) =>
      template.job_type === "freelance" &&
      tiers.includes(template.tier) &&
      catalog.jobTemplateXp.some((row) => row.template_id === template.id && skills.has(row.skill_id)),
  );
}

/** Weekday mornings hand out 0–3 company tasks (≈20% of days have none). */
export function rollDailyCompanyTasks(
  state: CareerState,
  day: number,
  minute: number,
  catalog = SIM_CATALOG,
): CareerState {
  const employment = employmentOf(state);
  const current = employment.current;
  if (!current || !state.feed) return state;
  if (calendar(day).weekday >= 5) return state;
  if (hashUnit(Math.imul(day, 77) + 5) < FULLTIME.tasks.empty_day_chance) return state;
  const position = positionById(current.positionId);
  if (!position) return state;

  const [min, max] = FULLTIME.tasks.counts[position.level_tier] ?? [0, 1];
  const count = min + Math.floor(hashUnit(Math.imul(day, 31) + 7) * (max - min + 1));
  if (count <= 0) return state;

  const busy = new Set(
    state.player_jobs
      .filter((job) => job.status === "offered" || job.status === "active")
      .map((job) => job.template_id),
  );
  const pool = companyTaskTemplates(catalog, position).filter((template) => !busy.has(template.id));
  const picked = shuffleSeeded(pool, day * 997 + state.player_jobs.length).slice(0, count);
  if (picked.length === 0) return state;

  let jobs = state.player_jobs;
  let notices = state.feed.notices;
  picked.forEach((template, index) => {
    const job: PlayerJob = {
      ...offerJob(template, day),
      id: `ctask-${day}-${template.id}-${index}`,
      source: "company",
      pay: 0,
    };
    jobs = [...jobs, job];
    notices = pushNotice(notices, {
      id: `ft-task-${job.id}`,
      day,
      minute,
      severity: "info",
      icon: FT_JOB_ICON,
      title: template.name,
      text: `📋 Task mới từ ${current.company}: ${template.name}`,
      detail: `${current.company} · ${STACK_LABEL[position.stack]} · hạn ${deadlineDaysForTier(template.tier)} ngày`,
      action: "acceptJob",
      actions: [{ id: "acceptJob", label: NOTICE_ACTION_DEFAULT_LABEL.acceptJob, variant: "primary" }],
      payload: { jobId: job.id },
      read: false,
    });
  });
  return { ...state, player_jobs: jobs, feed: { ...state.feed, notices } };
}

/** Company tasks cannot be refused: an unaccepted one joins the board overnight. */
export function autoAcceptCompanyTasks(state: CareerState, day: number): CareerState {
  const prevDay = day - 1;
  const targets = state.player_jobs.filter(
    (job) => job.source === "company" && job.status === "offered" && job.offered_day === prevDay,
  );
  if (targets.length === 0) return state;
  const ids = new Set(targets.map((job) => job.id));
  const notices = (state.feed?.notices ?? []).filter(
    (notice) => !ids.has(notice.payload?.jobId ?? ""),
  );
  return {
    ...state,
    player_jobs: state.player_jobs.map((job) =>
      ids.has(job.id) ? { ...job, status: "active" as const, accepted_day: prevDay } : job,
    ),
    feed: state.feed ? { ...state.feed, notices } : state.feed,
  };
}

/* ---------------------------------------------------- strikes / firing */

/** Late costs 5% of the month's salary + 1 rep + 1 strike; a test fail only costs the strike. */
export function addCompanyStrike(
  state: CareerState,
  job: PlayerJob,
  kind: "late" | "fail",
): CareerState {
  const employment = employmentOf(state);
  const current = employment.current;
  if (!current) return state;
  const late = kind === "late";
  const penalty = late ? Math.round(current.salary * FULLTIME.late_penalty_pct) : 0;
  const reputation = late
    ? Math.max(0, state.players.reputation + FULLTIME.late_reputation)
    : state.players.reputation;

  const template = SIM_CATALOG.jobTemplates.find((row) => row.id === job.template_id);
  const name = template?.name ?? job.template_id;
  const day = state.players.game_day;
  const minute = state.players.game_minute;

  let notices = state.feed?.notices ?? [];
  if (late) {
    notices = pushNotice(notices, {
      id: `ft-late-${job.id}`,
      day,
      minute,
      severity: "warn",
      icon: REMIND_ICON,
      text: `Task trễ hạn: ${name} · −${Math.round(FULLTIME.late_penalty_pct * 100)}% lương tháng, −1 uy tín, +1 strike`,
      action: null,
      read: false,
    });
  }

  const struck: CurrentEmployment = {
    ...current,
    strikes: current.strikes + 1,
    strikesThisMonth: current.strikesThisMonth + 1,
    monthPenalty: current.monthPenalty + penalty,
    lateTasks: current.lateTasks + (late ? 1 : 0),
  };
  if (struck.strikes === FULLTIME.strike_warn) {
    notices = pushNotice(notices, {
      id: `ft-warn-${day}`,
      day,
      minute,
      severity: "warn",
      icon: REMIND_ICON,
      text: "⚠️ Quản lý nhắc nhở về deadline",
      action: null,
      read: false,
    });
  }

  const next: CareerState = {
    ...state,
    players: { ...state.players, reputation },
    employment: { ...employment, current: struck },
    feed: state.feed ? { ...state.feed, notices } : state.feed,
  };
  if (struck.strikes >= FULLTIME.strike_fire) {
    return fireEmployee(next, day);
  }
  return next;
}

/** 3 strikes: fired. Effects land now, the remaining salary pays when the popup closes. */
export function fireEmployee(state: CareerState, day: number): CareerState {
  const employment = employmentOf(state);
  const current = employment.current;
  if (!current) return state;
  const payout = Math.max(
    0,
    Math.round((current.salary * current.daysWorkedThisMonth) / LIFE.days_per_month) - current.monthPenalty,
  );
  const cancelled = companyJobIds(state, ["offered", "active"]);
  const notices = (state.feed?.notices ?? []).filter(
    (notice) => !cancelled.has(notice.payload?.jobId ?? "") || !notice.actions?.some((b) => b.id === "acceptJob"),
  );
  return {
    ...state,
    players: {
      ...state.players,
      reputation: Math.max(0, state.players.reputation + FULLTIME.fire_reputation),
      mood: Math.max(LIFE.stat_min, state.players.mood + FULLTIME.fire_mood),
    },
    player_jobs: state.player_jobs.map((job) =>
      cancelled.has(job.id) ? { ...job, status: "fired" as const } : job,
    ),
    employment: {
      ...employment,
      current: null,
      blockedCompanies: { ...employment.blockedCompanies, [current.company]: day + FULLTIME.block_days },
      fired: {
        company: current.company,
        days: current.totalDays,
        lateTasks: current.lateTasks,
        payout,
        open: true,
      },
    },
    feed: state.feed ? { ...state.feed, notices } : state.feed,
  };
}

/** Đóng on the firing popup: the remaining salary lands in the purse. */
export function closeFiredPopup(state: CareerState): { state: CareerState; events: GameEvent[] } {
  const employment = employmentOf(state);
  const fired = employment.fired;
  if (!fired || !fired.open) return { state, events: [] };
  const next: CareerState = { ...state, employment: { ...employment, fired: null } };
  if (fired.payout <= 0) return { state: next, events: [] };
  const money = applyMoney(state.players.money, fired.payout);
  const paid = notePurse(
    { ...next, players: { ...next.players, money } },
    fired.payout,
    "earn",
  );
  return { state: paid, events: [{ type: "moneyChanged", delta: fired.payout, money }] };
}

/* -------------------------------------------------------------- payday */

/** True at 18:00 on the last day of the month, once. */
export function paydayDue(state: CareerState, day: number): boolean {
  const employment = employmentOf(state);
  if (calendar(day).dayOfMonth !== LIFE.days_per_month) return false;
  if (employment.lastPaydayKey === monthKey(day)) return false;
  return employment.current != null || employment.pendingPayouts.length > 0;
}

/**
 * Settle the month of `day`: salary × days worked ÷ days in month − penalty,
 * quit-job payouts, +5 mood, and the clean-month strike reduction.
 */
export function settlePayday(state: CareerState, day: number, minute: number): CareerState {
  const employment = employmentOf(state);
  const key = monthKey(day);
  if (employment.lastPaydayKey === key) return state;
  if (!state.feed) return state;

  let notices = state.feed.notices;
  const payouts = employment.pendingPayouts.filter((row) => row.monthKey === key);
  let money = 0;
  let mood = 0;
  let next: CareerState = { ...state, employment: { ...employment, lastPaydayKey: key } };

  const current = employment.current;
  if (current && current.countedMonthKey === key) {
    const gross = Math.round((current.salary * current.daysWorkedThisMonth) / LIFE.days_per_month);
    const pay = Math.max(0, gross - current.monthPenalty);
    money += pay;
    mood += FULLTIME.payday_mood;
    const detail =
      current.monthPenalty > 0
        ? `Làm ${current.daysWorkedThisMonth} ngày · trừ phạt trễ −${formatVnd(current.monthPenalty)}`
        : `Làm ${current.daysWorkedThisMonth} ngày`;
    notices = pushNotice(notices, {
      id: `ft-payday-${key}`,
      day,
      minute,
      severity: "info",
      icon: "icon_notif_salary.png",
      text: `💰 Lương tháng ${calendar(day).month}: +${formatVnd(pay)}`,
      detail,
      action: null,
      read: false,
      cue: "salary",
    });
    const strikes =
      current.strikesThisMonth === 0
        ? Math.max(0, current.strikes - FULLTIME.strike_clean_gain)
        : current.strikes;
    next = {
      ...next,
      employment: {
        ...employmentOf(next),
        current: {
          ...current,
          strikes,
          strikesThisMonth: 0,
          monthPenalty: 0,
          daysWorkedThisMonth: 0,
          countedMonthKey: key,
        },
      },
    };
  }

  for (const payout of payouts) {
    money += payout.amount;
    notices = pushNotice(notices, {
      id: `ft-payout-${payout.company}-${key}`,
      day,
      minute,
      severity: "info",
      icon: "icon_notif_salary.png",
      text: `💰 ${payout.company} thanh toán lương còn lại: +${formatVnd(payout.amount)}`,
      action: null,
      read: false,
      cue: "salary",
    });
  }
  if (payouts.length > 0) {
    next = {
      ...next,
      employment: {
        ...employmentOf(next),
        pendingPayouts: employmentOf(next).pendingPayouts.filter((row) => row.monthKey !== key),
      },
    };
  }
  if (money === 0 && mood === 0) {
    return { ...next, feed: { ...state.feed, notices } };
  }
  const applied = applyEventStats(next, { money, mood });
  return { ...applied.state, feed: { ...applied.state.feed!, notices } };
}

/* ------------------------------------------------------------ day hook */

/**
 * Full-time housekeeping for `dayStarted`: reveal application results, reroll
 * the weekly board, settle a finished month (18h fallback), count the worked
 * day, auto-accept yesterday's tasks, and hand out today's company tasks.
 */
export function fulltimeDayStart(
  state: CareerState,
  day: number,
  minute: number,
  catalog = SIM_CATALOG,
): CareerState {
  let next = expireApplicationOffers(state, day);
  next = resolveApplicationsDay(next, day, minute);
  next = {
    ...next,
    employment: ensureWeeklyBoard(employmentOf(next), day),
  };

  const key = monthKey(day);
  let employment = employmentOf(next);
  if (employment.current && employment.current.countedMonthKey !== key) {
    const prevDay = day - 1;
    if (monthKey(prevDay) !== employment.lastPaydayKey) {
      next = settlePayday(next, prevDay, minute);
      employment = employmentOf(next);
    }
    if (employment.current) {
      next = {
        ...next,
        employment: {
          ...employment,
          current: {
            ...employment.current,
            countedMonthKey: key,
            daysWorkedThisMonth: 0,
            monthPenalty: 0,
            strikesThisMonth: 0,
          },
        },
      };
      employment = employmentOf(next);
    }
  }

  if (employment.current) {
    next = {
      ...next,
      employment: {
        ...employment,
        current: {
          ...employment.current,
          daysWorkedThisMonth: employment.current.daysWorkedThisMonth + 1,
          totalDays: employment.current.totalDays + 1,
        },
      },
    };
  }

  next = autoAcceptCompanyTasks(next, day);
  next = rollDailyCompanyTasks(next, day, minute, catalog);
  return next;
}

/** Days from `day` until the month-end payday (inclusive of today). For the UI. */
export function daysUntilPayday(day: number): number {
  return LIFE.days_per_month - calendar(day).dayOfMonth + 1;
}
