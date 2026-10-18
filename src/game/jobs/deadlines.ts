import {
  NOTICE_ACTION_DEFAULT_LABEL,
  type CareerState,
  type LifeNotice,
  type NoticeActionButton,
  type SimCatalog,
} from "../career/types";
import { SIM_CATALOG } from "../career/content";
import { LIFE } from "../life/content";
import { LIFE_EVENTS } from "../life/events-content";

const REMIND_ICON = "icon_notif_deadline.png";

function jobName(templateId: string, catalog: SimCatalog): string {
  return catalog.jobTemplates.find((row) => row.id === templateId)?.name ?? templateId;
}

function pushNotice(notices: LifeNotice[], notice: LifeNotice): LifeNotice[] {
  if (notices.some((row) => row.id === notice.id)) return notices;
  const next = [...notices, notice];
  const cap = LIFE_EVENTS.notice_cap;
  return next.length > cap ? next.slice(next.length - cap) : next;
}

/**
 * Cancel accepted jobs whose deadline has passed, and remind when
 * `job_remind_days` remain. Money, skills, and progress on other jobs stay.
 */
export function applyJobDeadlines(
  state: CareerState,
  day: number,
  minute: number,
  catalog: SimCatalog = SIM_CATALOG,
): CareerState {
  if (!state.feed) return state;
  let reputation = state.players.reputation;
  let mood = state.players.mood;
  let notices = state.feed.notices;
  let changed = false;
  const jobs = state.player_jobs.map((job) => {
    if (job.status !== "active" || job.deadline_day == null) return job;
    const left = job.deadline_day - day;
    if (left < 0) {
      changed = true;
      reputation = Math.max(0, reputation + LIFE.job_late_reputation);
      mood = Math.max(0, mood + LIFE.job_late_mood);
      const name = jobName(job.template_id, catalog);
      notices = pushNotice(notices, {
        id: `late-${job.id}`,
        day,
        minute,
        severity: "warn",
        icon: REMIND_ICON,
        text: `Trễ deadline: ${name}`,
        action: null,
        read: false,
      });
      return { ...job, status: "failed" as const };
    }
    if (left === LIFE.job_remind_days) {
      const name = jobName(job.template_id, catalog);
      const actions: NoticeActionButton[] = [
        { id: "openJobs", label: NOTICE_ACTION_DEFAULT_LABEL.openJobs, variant: "primary" },
      ];
      const before = notices.length;
      notices = pushNotice(notices, {
        id: `deadline-${job.id}`,
        day,
        minute,
        severity: "warn",
        icon: REMIND_ICON,
        text: `Còn ${LIFE.job_remind_days} ngày: ${name}`,
        action: "openJobs",
        actions,
        payload: { jobId: job.id },
        read: false,
      });
      if (notices.length !== before) changed = true;
    }
    return job;
  });
  if (!changed) return state;
  return {
    ...state,
    players: { ...state.players, reputation, mood },
    player_jobs: jobs,
    feed: { ...state.feed, notices },
  };
}
