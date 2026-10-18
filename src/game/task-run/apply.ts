import type { GameEvent } from "../events/types";
import { addSkillXp, grantedXp, skillXpEvents } from "../knowledge/logic";
import {
  jobEligibility,
  jobRequirementsFor,
  skillNameMap,
} from "../jobs/logic";
import { notePurse } from "../life/purse";
import { applyMoney } from "../vitals/logic";
import { LIFE } from "../life/content";
import { takePendingBugDelta } from "../life/events";
import { jobEnergyFactor, scaleWorkXp } from "../life/furniture";
import { scaleTraitPay, scaleTraitXp, traitBugCount, traitJobHours } from "../life/traits";
import {
  applyActionStats,
  energyCost,
  jobPay,
  lifeOf,
  markWorked,
  moodBugBonus,
  scaleXpForMood,
} from "../life/logic";
import type { JobGate } from "../jobs/logic";
import type { ActionResult } from "../career/actions";
import {
  type CareerState,
  type PlayerEvent,
  type PlayerJob,
  type PlayerSkill,
  type SkillId,
  type SimCatalog,
} from "../career/types";
import { TASK_RUN } from "./content";
import { bugCount, rollTaskEvent, taskSeed } from "./formula";
import {
  applyBeginTest,
  applyBuildChoice,
  applyCatch,
  applyRetry,
  applyTestFail,
  applyTicketChoice,
  canRetry,
  freshRun,
  isCleared,
} from "./machine";
import type { TaskBuildChoice, TaskRun, TaskTicket, TaskTicketChoice } from "./types";

function withEvents(state: CareerState, events: readonly GameEvent[]): CareerState {
  if (events.length === 0) return state;
  const start = state.player_events.length;
  const appended: PlayerEvent[] = events.map((event, index) => {
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event)) {
      if (key !== "type") payload[key] = value;
    }
    return {
      id: `e-${start + index + 1}`,
      type: event.type,
      day: state.players.game_day,
      payload,
    };
  });
  return { ...state, player_events: [...state.player_events, ...appended] };
}

function ok(state: CareerState, events: GameEvent[]): ActionResult {
  return { state: withEvents(state, events), events, minutes: 0, error: null };
}

function fail(state: CareerState, error: string): ActionResult {
  return { state, events: [], minutes: 0, error };
}

function skillById(skills: readonly PlayerSkill[], skillId: SkillId): PlayerSkill {
  return skills.find((row) => row.skill_id === skillId) ?? { skill_id: skillId, level: 1, xp: 0 };
}

function replaceSkill(skills: readonly PlayerSkill[], next: PlayerSkill): PlayerSkill[] {
  const exists = skills.some((row) => row.skill_id === next.skill_id);
  if (!exists) return [...skills, next];
  return skills.map((row) => (row.skill_id === next.skill_id ? next : row));
}

function patchJob(state: CareerState, jobId: string, job: PlayerJob): CareerState {
  return {
    ...state,
    player_jobs: state.player_jobs.map((row) => (row.id === jobId ? job : row)),
  };
}

function findJob(state: CareerState, jobId: string): PlayerJob | undefined {
  return state.player_jobs.find((row) => row.id === jobId);
}

export function ticketForSkill(skillId: SkillId, tickets: readonly TaskTicket[]): TaskTicket | null {
  return tickets.find((row) => row.skill_id === skillId) ?? tickets[0] ?? null;
}

export function primarySkillId(templateId: string, catalog: SimCatalog): SkillId {
  const grant = catalog.jobTemplateXp.find((row) => row.template_id === templateId);
  return grant?.skill_id ?? "frontend";
}

function requireRun(state: CareerState, jobId: string): { job: PlayerJob; run: TaskRun } | string {
  const job = findJob(state, jobId);
  if (!job) return "Không tìm thấy việc";
  if (job.status !== "active" || !job.task_run) return "Việc này chưa bắt đầu";
  return { job, run: job.task_run };
}

function gateFor(state: CareerState): JobGate {
  const life = lifeOf(state);
  return {
    workStreak: life.workStreak,
    minEnergy: LIFE.low_energy_job,
    blockFreelance: life.burnoutDay === state.players.game_day,
    energyFactor: jobEnergyFactor(state),
  };
}

export function startTask(
  state: CareerState,
  jobId: string,
  catalog: SimCatalog,
  force = false,
): ActionResult {
  const job = findJob(state, jobId);
  if (!job) return fail(state, "Không tìm thấy việc");
  if (job.status === "active" && job.task_run) return { state, events: [], minutes: 0, error: null };
  const continuing = job.status === "active";
  if (!continuing && job.status !== "offered") return fail(state, "Việc này không còn nhận được");

  const template = catalog.jobTemplates.find((row) => row.id === job.template_id);
  if (!template) return fail(state, "Không tìm thấy việc");

  const names = skillNameMap(catalog.skills);
  const check = jobEligibility(
    state.players,
    state.player_skills,
    template,
    jobRequirementsFor(template.id, catalog.jobTemplateRequirements),
    names,
    gateFor(state),
  );
  if (!check.ok && !(force && check.energyShort)) {
    return fail(state, check.missing[0] ?? "Chưa đủ điều kiện");
  }

  const spent = applyActionStats(state, {
    energy: -template.energy * jobEnergyFactor(state),
    health: force && check.energyShort ? LIFE.force_health : 0,
  });
  const nextJob: PlayerJob = {
    ...job,
    status: "active",
    accepted_day: job.accepted_day ?? state.players.game_day,
    pay: continuing
      ? job.pay
      : scaleTraitPay(jobPay(template.pay, template.tier, state.players.reputation), state),
    hours_required: continuing ? job.hours_required : traitJobHours(template.hours, state),
    task_run: freshRun(taskSeed(job.id)),
  };
  const events: GameEvent[] = [
    { type: "taskStarted", jobId: job.id, templateId: template.id },
    ...(continuing ? [] : [{ type: "jobAccepted" as const, jobId: job.id, templateId: template.id }]),
    ...spent.events,
  ];
  return {
    ...ok(patchJob(spent.state, job.id, nextJob), events),
    skipDays: spent.skipDays,
  };
}

export function chooseTicket(
  state: CareerState,
  jobId: string,
  choice: TaskTicketChoice,
  catalog: SimCatalog,
): ActionResult {
  const found = requireRun(state, jobId);
  if (typeof found === "string") return fail(state, found);
  if (found.run.step !== "ticket") return fail(state, "Hết giờ đọc phiếu");

  const skillId = primarySkillId(found.job.template_id, catalog);
  const ticket = ticketForSkill(skillId, TASK_RUN.tickets);
  if (!ticket) return fail(state, "Không có phiếu");

  const rolled = rollTaskEvent(found.run.seed, TASK_RUN.event_chance, TASK_RUN.events);
  const extra = choice === "ask" ? TASK_RUN.ask_extra_sec : 0;
  const run = applyTicketChoice(found.run, choice, rolled?.id ?? null, extra + (rolled?.time_delta_sec ?? 0));
  const events: GameEvent[] = [
    { type: "ticketChosen", jobId, choice },
  ];
  if (rolled) events.push({ type: "randomEventFired", jobId, eventId: rolled.id });
  return ok(patchJob(state, jobId, { ...found.job, task_run: run }), events);
}

export function chooseBuild(
  state: CareerState,
  jobId: string,
  choice: TaskBuildChoice,
  catalog: SimCatalog,
): ActionResult {
  const found = requireRun(state, jobId);
  if (typeof found === "string") return fail(state, found);
  if (found.run.step !== "build" || found.run.ticket === null) return fail(state, "Chưa tới lúc đóng gói");
  if (found.run.build !== null) return fail(state, "Đã chọn cách làm");

  const skillId = primarySkillId(found.job.template_id, catalog);
  const ticket = ticketForSkill(skillId, TASK_RUN.tickets);
  const skill = skillById(state.player_skills, skillId);
  const event = TASK_RUN.events.find((row) => row.id === found.run.event_id) ?? null;
  const pendingBugs = takePendingBugDelta(state);
  const bugs = traitBugCount(
    bugCount({
      skillLevel: skill.level,
      difficulty: ticket?.difficulty ?? 1,
      ticket: found.run.ticket,
      build: choice,
      eventBugDelta: (event?.bug_delta ?? 0) + moodBugBonus(state.players.mood) + pendingBugs.delta,
      formula: TASK_RUN.bugs,
    }),
    state,
    TASK_RUN.bugs,
  );
  const timeDelta = choice === "careful" ? TASK_RUN.careful_extra_sec : TASK_RUN.rushed_extra_sec;
  const run = applyBuildChoice(found.run, choice, bugs, timeDelta);
  return ok(patchJob(pendingBugs.state, jobId, { ...found.job, bugs, task_run: run }), [
    { type: "buildChoice", jobId, choice },
  ]);
}

export function beginTest(state: CareerState, jobId: string): ActionResult {
  const found = requireRun(state, jobId);
  if (typeof found === "string") return fail(state, found);
  if (found.run.step === "test") return { state, events: [], minutes: 0, error: null };
  if (found.run.step !== "build" || found.run.build === null) return fail(state, "Chưa đóng gói xong");
  const run = applyBeginTest(found.run);
  return ok(patchJob(state, jobId, { ...found.job, task_run: run }), []);
}

export function catchBug(state: CareerState, jobId: string, catalog: SimCatalog): ActionResult {
  const found = requireRun(state, jobId);
  if (typeof found === "string") return fail(state, found);
  if (found.run.step !== "test" || found.run.bugs_caught >= found.run.bugs_total) {
    return { state, events: [], minutes: 0, error: null };
  }
  const run = applyCatch(found.run);
  const events: GameEvent[] = [
    { type: "bugCaught", jobId, caught: run.bugs_caught, total: run.bugs_total },
  ];
  const next = patchJob(state, jobId, { ...found.job, task_run: run });
  if (!isCleared(run)) return ok(next, events);
  const done = grantTaskSuccess(withEvents(next, events), jobId, catalog);
  return {
    state: done.state,
    events: [...events, ...done.events],
    minutes: 0,
    error: done.error,
  };
}

export function finishTest(state: CareerState, jobId: string, catalog: SimCatalog): ActionResult {
  const found = requireRun(state, jobId);
  if (typeof found === "string") return fail(state, found);
  if (found.run.step === "result") return { state, events: [], minutes: 0, error: null };
  if (found.run.step !== "test") return fail(state, "Chưa tới bước kiểm tra");
  if (isCleared(found.run)) return grantTaskSuccess(state, jobId, catalog);

  const escaped = found.run.bugs_total - found.run.bugs_caught;
  const failedRun = applyTestFail(found.run);
  const finalFail = !canRetry(failedRun, TASK_RUN.max_retries);
  const events: GameEvent[] = [{ type: "bugEscaped", jobId, escaped }];
  if (finalFail) return grantTaskFail(state, found.job, failedRun, events);
  events.push({
    type: "taskFailed",
    jobId,
    templateId: found.job.template_id,
    final: false,
    reputationDelta: 0,
  });
  return ok(
    patchJob(state, jobId, { ...found.job, bugs: escaped, task_run: failedRun }),
    events,
  );
}

export function retryTask(state: CareerState, jobId: string, catalog: SimCatalog): ActionResult {
  void catalog;
  const existing = findJob(state, jobId);
  if (existing?.status === "failed") return fail(state, "Hết lượt làm lại");
  const found = requireRun(state, jobId);
  if (typeof found === "string") return fail(state, found);
  if (!canRetry(found.run, TASK_RUN.max_retries)) return fail(state, "Hết lượt làm lại");
  const retryEnergy = TASK_RUN.retry_energy * jobEnergyFactor(state);
  const cost = energyCost(retryEnergy, lifeOf(state).workStreak);
  if (state.players.energy < cost) return fail(state, "Không đủ năng lượng");

  const spent = applyActionStats(state, { energy: -retryEnergy });
  const run = applyRetry(found.run);
  return {
    ...ok(
      patchJob(spent.state, jobId, { ...found.job, task_run: run }),
      [{ type: "taskRetried", jobId, energy: TASK_RUN.retry_energy }, ...spent.events],
    ),
    skipDays: spent.skipDays,
  };
}

function grantToSkill(
  state: CareerState,
  skillId: SkillId,
  amount: number,
  catalog: SimCatalog,
): { state: CareerState; events: GameEvent[] } {
  const scaled = scaleXpForMood(amount, state.players.mood);
  if (scaled <= 0) return { state, events: [] };
  const current = skillById(state.player_skills, skillId);
  const applied = addSkillXp(current, scaled, catalog.skillLevelXp);
  return {
    state: { ...state, player_skills: replaceSkill(state.player_skills, applied.skill) },
    events: skillXpEvents(skillId, applied, catalog.config.rank_brackets),
  };
}

export function grantTaskSuccess(
  state: CareerState,
  jobId: string,
  catalog: SimCatalog,
): ActionResult {
  const job = findJob(state, jobId);
  if (!job || !job.task_run) return fail(state, "Không tìm thấy việc");
  const template = catalog.jobTemplates.find((row) => row.id === job.template_id);
  if (!template) return fail(state, "Không tìm thấy việc");

  const day = state.players.game_day;
  const pay = scaleTraitPay(jobPay(template.pay, template.tier, state.players.reputation), state);
  const money = applyMoney(state.players.money, pay);
  const freelance_completed = state.players.freelance_completed + 1;
  const reputation = state.players.reputation + template.reputation_gain;
  const completed: PlayerJob = {
    ...job,
    status: "completed",
    finished_day: day,
    bugs: 0,
    pay,
    task_run: { ...job.task_run, step: "result", outcome: "success" },
  };
  let next: CareerState = markWorked(
    patchJob(
      {
        ...state,
        players: { ...state.players, money, reputation, freelance_completed },
      },
      job.id,
      completed,
    ),
  );
  const events: GameEvent[] = [
    { type: "taskSucceeded", jobId: job.id, templateId: template.id, pay },
    { type: "jobCompleted", jobId: job.id, templateId: template.id, pay },
    { type: "moneyChanged", delta: pay, money },
  ];
  const grants = catalog.jobTemplateXp.filter((row) => row.template_id === template.id);
  for (const grant of grants) {
    const skill = skillById(next.player_skills, grant.skill_id);
    const amount = scaleWorkXp(
      scaleTraitXp(grantedXp(grant.xp, skill.level, "job", catalog.config), next, grant.skill_id, "job"),
      next,
    );
    const applied = grantToSkill(next, grant.skill_id, amount, catalog);
    next = applied.state;
    events.push(...applied.events);
  }
  for (const milestone of catalog.milestones) {
    if (next.player_unlocks.some((row) => row.milestone_id === milestone.id)) continue;
    if (freelance_completed < milestone.freelance_completed) continue;
    next = {
      ...next,
      player_unlocks: [...next.player_unlocks, { milestone_id: milestone.id, reached_day: day }],
    };
    events.push({
      type: "milestoneReached",
      milestoneId: milestone.id,
      freelanceCompleted: freelance_completed,
    });
  }
  return ok(notePurse(next, pay, "earn"), events);
}

function grantTaskFail(
  state: CareerState,
  job: PlayerJob,
  run: TaskRun,
  prior: GameEvent[],
): ActionResult {
  const reputationDelta = -TASK_RUN.fail_reputation;
  const reputation = Math.max(0, state.players.reputation + reputationDelta);
  const failed: PlayerJob = {
    ...job,
    status: "failed",
    finished_day: state.players.game_day,
    bugs: Math.max(0, run.bugs_total - run.bugs_caught),
    task_run: run,
  };
  const events: GameEvent[] = [
    ...prior,
    {
      type: "taskFailed",
      jobId: job.id,
      templateId: job.template_id,
      final: true,
      reputationDelta: reputation - state.players.reputation,
    },
  ];
  return ok(
    patchJob({ ...state, players: { ...state.players, reputation } }, job.id, failed),
    events,
  );
}

/** Scripted perfect run for callers that still want the old one-shot payout. */
export function applyAccept(state: CareerState, jobId: string, catalog: SimCatalog): ActionResult {
  const started = startTask(state, jobId, catalog);
  if (started.error) return started;
  const done = grantTaskSuccess(started.state, jobId, catalog);
  if (done.error) return done;
  return { state: done.state, events: [...started.events, ...done.events], minutes: 0, error: null };
}
