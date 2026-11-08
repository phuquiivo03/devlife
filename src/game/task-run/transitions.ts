import type { GameEvent } from "../events/types";
import {
  agentSnapshot,
  agentActive,
  anyAgentActive,
  agentShopUnlocked,
  filterBugsForAgent,
  ownsAgent,
} from "../agents/logic";
import { AGENTS } from "../agents/content";
import type { AgentId } from "../agents/types";
import type { ActionResult } from "../career/actions";
import { NOTICE_ACTION_DEFAULT_LABEL } from "../career/types";
import {
  jobEligibility,
  jobRequirementsFor,
  skillNameMap,
} from "../jobs/logic";
import { takePendingBugDelta } from "../life/events";
import { jobEnergyFactor } from "../life/furniture";
import { LIFE } from "../life/content";
import { applyActionStats, jobPay, lifeOf, moodBugBonus } from "../life/logic";
import { scaleTraitPay, traitBugCount, traitJobHours } from "../life/traits";
import { TASK_RUN } from "./content";
import { bugCount, rollTaskEvent, taskSeed } from "./formula";
import { primarySkillId, ticketForSkill } from "./helpers";
import {
  bumpRevision,
  freshRun,
  remainingFixWork,
  syncBugCounters,
} from "./machine";
import type { CareerState, PlayerJob, SimCatalog, TaskRun } from "../career/types";

function findJob(state: CareerState, jobId: string): PlayerJob | undefined {
  return state.player_jobs.find((row) => row.id === jobId);
}

function patchJob(state: CareerState, jobId: string, job: PlayerJob): CareerState {
  return { ...state, player_jobs: state.player_jobs.map((row) => (row.id === jobId ? job : row)) };
}

function ok(state: CareerState, events: GameEvent[]): ActionResult {
  return { state, events, minutes: 0, error: null };
}

function fail(state: CareerState, error: string): ActionResult {
  return { state, events: [], minutes: 0, error };
}

function jobGate(state: CareerState) {
  const life = lifeOf(state);
  return {
    workStreak: life.workStreak,
    minEnergy: LIFE.low_energy_job,
    blockFreelance: life.burnoutDay === state.players.game_day,
    energyFactor: jobEnergyFactor(state),
  };
}

export type BeginChoice = { mode: "manual" } | { mode: "agent"; coderId: AgentId };

export function openTaskRun(
  state: CareerState,
  jobId: string,
  catalog: SimCatalog,
  force = false,
): ActionResult {
  const job = findJob(state, jobId);
  if (!job) return fail(state, "Không tìm thấy việc");
  if (job.status === "active" && job.task_run) {
    return { state, events: [], minutes: 0, error: null };
  }
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
    jobGate(state),
  );
  if (!check.ok && !(force && check.energyShort)) {
    return fail(state, check.missing[0] ?? "Chưa đủ điều kiện");
  }

  const nextJob: PlayerJob = {
    ...job,
    status: "active",
    accepted_day: job.accepted_day ?? state.players.game_day,
    pay: continuing
      ? job.pay
      : scaleTraitPay(jobPay(template.pay, template.tier, state.players.reputation), state),
    hours_required: continuing ? job.hours_required : traitJobHours(template.hours, state),
    task_run: { ...freshRun(taskSeed(job.id)), step: "select", force: Boolean(force && check.energyShort) },
  };
  const events: GameEvent[] = continuing
    ? []
    : [{ type: "jobAccepted", jobId: job.id, templateId: template.id }];
  return ok(patchJob(state, job.id, nextJob), events);
}

function computePotentialB(
  state: CareerState,
  job: PlayerJob,
  catalog: SimCatalog,
  eventBugDelta: number,
): number {
  const skillId = primarySkillId(job.template_id, catalog);
  const ticketRow = ticketForSkill(skillId, TASK_RUN.tickets);
  const skill = state.player_skills.find((row) => row.skill_id === skillId) ?? {
    skill_id: skillId,
    level: 1,
    xp: 0,
  };
  return traitBugCount(
    bugCount({
      skillLevel: skill.level,
      difficulty: ticketRow?.difficulty ?? 1,
      ticket: "correct",
      build: "careful",
      eventBugDelta: eventBugDelta + moodBugBonus(state.players.mood),
      formula: TASK_RUN.bugs,
    }),
    state,
    TASK_RUN.bugs,
  );
}

export function beginTaskRun(
  state: CareerState,
  jobId: string,
  choice: BeginChoice,
  catalog: SimCatalog,
): ActionResult {
  const job = findJob(state, jobId);
  if (!job?.task_run || job.status !== "active") return fail(state, "Việc này chưa bắt đầu");
  if (job.task_run.step !== "select") return fail(state, "Đã bắt đầu task");
  if (job.task_run.start_paid) return fail(state, "Đã trừ năng lượng");

  const template = catalog.jobTemplates.find((row) => row.id === job.template_id);
  if (!template) return fail(state, "Không tìm thấy việc");

  const names = skillNameMap(catalog.skills);
  const check = jobEligibility(
    state.players,
    state.player_skills,
    template,
    jobRequirementsFor(template.id, catalog.jobTemplateRequirements),
    names,
    jobGate(state),
  );
  const force = job.task_run.force && check.energyShort;
  if (!check.ok && !force) {
    return fail(state, check.missing[0] ?? "Chưa đủ điều kiện");
  }

  const spent = applyActionStats(state, {
    energy: -template.energy * jobEnergyFactor(state),
    health: force ? LIFE.force_health : 0,
  });

  let run = bumpRevision({ ...job.task_run, start_paid: true, mode: choice.mode });
  const events: GameEvent[] = [
    { type: "taskStarted", jobId, templateId: template.id },
    ...spent.events,
  ];

  if (choice.mode === "manual") {
    run = { ...run, step: "ticket", build_runner: "manual" };
    return { ...ok(patchJob(spent.state, jobId, { ...job, task_run: run }), events), skipDays: spent.skipDays };
  }

  if (!agentShopUnlocked(spent.state)) return fail(spent.state, "Hoàn thành 1 việc freelance để mở.");
  if (!agentActive(spent.state, choice.coderId)) {
    return fail(
      spent.state,
      ownsAgent(spent.state, choice.coderId) ? "License agent đã hết hạn." : "Chưa có license agent này.",
    );
  }

  const snapshot = agentSnapshot(choice.coderId);
  const rolled = rollTaskEvent(run.seed, TASK_RUN.event_chance, TASK_RUN.events);
  const pending = takePendingBugDelta(spent.state);
  const eventDelta = (rolled?.bug_delta ?? 0) + pending.delta;
  const B = computePotentialB(pending.state, job, catalog, eventDelta);
  const surviving = filterBugsForAgent(run.seed, snapshot, B);

  run = syncBugCounters({
    ...run,
    step: "build",
    ticket: "correct",
    build: "careful",
    event_id: rolled?.id ?? null,
    build_runner: "agent",
    coder: snapshot,
    potential_bugs: B,
    bug_ids: surviving,
    fixed_bug_ids: [],
    time_bonus_sec: rolled?.time_delta_sec ?? 0,
  });
  if (rolled) events.push({ type: "randomEventFired", jobId, eventId: rolled.id });
  events.push({ type: "ticketChosen", jobId, choice: "correct" });
  events.push({
    type: "buildChoice",
    jobId,
    choice: "careful",
    agentId: choice.coderId,
  } as GameEvent);

  return {
    ...ok(
      patchJob(pending.state, jobId, { ...job, bugs: surviving.length, task_run: run }),
      events,
    ),
    skipDays: spent.skipDays,
  };
}

export function completeAgentBuild(
  state: CareerState,
  jobId: string,
  revision: number,
): ActionResult {
  const job = findJob(state, jobId);
  if (!job?.task_run || job.task_run.step !== "build" || job.task_run.revision !== revision) {
    return ok(state, []);
  }
  if (job.task_run.build_runner !== "agent") return ok(state, []);
  const nextRun: TaskRun =
    job.task_run.bug_ids.length === 0
      ? bumpRevision({ ...job.task_run, step: "ready", build_progress: 1 })
      : bumpRevision({ ...job.task_run, step: "bug_choice", build_progress: 1 });
  return ok(patchJob(state, jobId, { ...job, task_run: nextRun }), []);
}

export function routeManualBuildComplete(state: CareerState, jobId: string): ActionResult {
  const job = findJob(state, jobId);
  if (!job?.task_run) return ok(state, []);
  const run = job.task_run;
  if (run.bug_ids.length > 0 && anyAgentActive(state)) {
    return ok(
      patchJob(state, jobId, { ...job, task_run: bumpRevision({ ...run, step: "bug_choice" }) }),
      [],
    );
  }
  return ok(state, []);
}

export function chooseTaskFixer(
  state: CareerState,
  jobId: string,
  revision: number,
  target: "manual" | AgentId,
): ActionResult {
  const job = findJob(state, jobId);
  if (!job?.task_run || job.status !== "active") return fail(state, "Việc này chưa bắt đầu");
  if (job.task_run.step !== "bug_choice" && job.task_run.step !== "test" && job.task_run.step !== "agent_fix") {
    return fail(state, "Chưa tới lúc chọn người sửa");
  }
  if (job.task_run.revision !== revision) return ok(state, []);

  let next = bumpRevision({ ...job.task_run, outcome: null });
  if (target === "manual") {
    next = { ...next, step: "test", fixer_id: null };
  } else {
    if (!agentActive(state, target)) {
      return fail(
        state,
        ownsAgent(state, target) ? "License agent đã hết hạn." : "Chưa có license agent này.",
      );
    }
    if (remainingFixWork(job.task_run) <= 1e-9) {
      next = { ...next, step: "ready", fixer_id: null };
    } else {
      next = { ...next, step: "agent_fix", fixer_id: target };
    }
  }
  return ok(patchJob(state, jobId, { ...job, task_run: next }), []);
}

export function checkpointBuildProgress(
  state: CareerState,
  jobId: string,
  revision: number,
  progress: number,
): ActionResult {
  const job = findJob(state, jobId);
  if (!job?.task_run || job.task_run.step !== "build" || job.task_run.revision !== revision) {
    return ok(state, []);
  }
  const p = Math.min(1, Math.max(job.task_run.build_progress, progress));
  return ok(patchJob(state, jobId, { ...job, task_run: { ...job.task_run, build_progress: p } }), []);
}

export function takeOverManualBuild(
  state: CareerState,
  jobId: string,
  revision: number,
): ActionResult {
  const job = findJob(state, jobId);
  if (!job?.task_run || job.task_run.revision !== revision || job.task_run.build_runner !== "agent") {
    return ok(state, []);
  }
  return ok(
    patchJob(state, jobId, { ...job, task_run: bumpRevision({ ...job.task_run, build_runner: "manual" }) }),
    [],
  );
}

export function checkpointManualTimer(
  state: CareerState,
  jobId: string,
  revision: number,
  leftSec: number,
): ActionResult {
  const job = findJob(state, jobId);
  if (!job?.task_run || job.task_run.step !== "test" || job.task_run.revision !== revision) {
    return ok(state, []);
  }
  const prev = job.task_run.manual_left_sec;
  const nextLeft = prev == null ? leftSec : Math.min(prev, leftSec);
  return ok(patchJob(state, jobId, { ...job, task_run: { ...job.task_run, manual_left_sec: nextLeft } }), []);
}

export function checkpointAgentFix(
  state: CareerState,
  jobId: string,
  revision: number,
  workDelta: number,
): ActionResult {
  const job = findJob(state, jobId);
  if (!job?.task_run || job.task_run.step !== "agent_fix" || job.task_run.revision !== revision) {
    return ok(state, []);
  }
  const run = job.task_run;
  if (!run.fixer_id) return ok(state, []);

  const total = run.bug_ids.length;
  if (total === 0 || remainingFixWork(run) <= 1e-9) {
    const nextRun = bumpRevision(
      syncBugCounters({ ...run, step: "ready", fixer_id: null }),
    );
    return ok(patchJob(state, jobId, { ...job, task_run: nextRun }), []);
  }

  const weight = 1 / total;
  let budget = Math.min(1, Math.max(0, workDelta));
  const fixed = [...run.fixed_bug_ids];
  let partial = run.fix_partial;

  for (const id of run.bug_ids) {
    if (fixed.includes(id)) continue;
    const need = (partial?.bug_id === id ? partial.left : 1) * weight;
    if (budget < need - 1e-9) {
      partial = { bug_id: id, left: (need - budget) / weight };
      budget = 0;
      break;
    }
    fixed.push(id);
    partial = null;
    budget -= need;
  }

  let nextRun = syncBugCounters({ ...run, fixed_bug_ids: fixed, fix_partial: partial });
  if (
    nextRun.fixed_bug_ids.length >= nextRun.bug_ids.length ||
    remainingFixWork(nextRun) <= 1e-9
  ) {
    nextRun = bumpRevision({ ...nextRun, step: "ready", fixer_id: null });
  }
  return ok(patchJob(state, jobId, { ...job, task_run: nextRun }), []);
}

export function switchTaskFixerBack(
  state: CareerState,
  jobId: string,
  revision: number,
): ActionResult {
  const job = findJob(state, jobId);
  if (!job?.task_run || job.task_run.revision !== revision) return ok(state, []);
  if (job.task_run.step !== "test" && job.task_run.step !== "agent_fix") return fail(state, "Không đổi được");
  return ok(
    patchJob(state, jobId, { ...job, task_run: bumpRevision({ ...job.task_run, step: "bug_choice" }) }),
    [],
  );
}

export function pushAgentUnlockNoticeIfNeeded(state: CareerState, beforeFreelance: number): CareerState {
  const flag = "agent_shop_unlock_noticed";
  if (state.feed.flags.includes(flag)) return state;
  if (beforeFreelance >= AGENTS.gate_freelance_completed) return state;
  if (state.players.freelance_completed < AGENTS.gate_freelance_completed) return state;
  const notice = {
    id: "agent-shop-unlock",
    day: state.players.game_day,
    minute: state.players.game_minute,
    severity: "info" as const,
    icon: "icon_action_open_store",
    text: "Đã mở AI Agent trong Cửa hàng",
    action: "openStore" as const,
    actions: [{ id: "openStore" as const, label: NOTICE_ACTION_DEFAULT_LABEL.openStore, variant: "primary" as const }],
    read: false,
    cue: null,
    payload: {},
  };
  const feed = state.feed;
  return {
    ...state,
    feed: {
      ...feed,
      notices: [...feed.notices, notice].slice(-50),
      flags: [...feed.flags, flag],
    },
  };
}
