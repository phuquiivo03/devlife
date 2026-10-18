import type { CareerState, LifeDiary, LifeFeed, LifeNotice, NoticeSeverity, SkillId } from "../career/types";
import { SKILL_IDS } from "../career/types";
import type { GameEvent } from "../events/types";
import { addSkillXp, skillXpEvents, xpToNextLevel } from "../knowledge/logic";
import type { SimCatalog } from "../career/types";
import { pinProgressLine, pinReady } from "./furniture";
import { diaryBooks, emptyPurse, notePurse } from "./purse";
import { applyEventStats, calendar, holidayOn, isDeployFriday, lifeOf, monthKey, scaleXpForMood, slotIndexFromWake, stageBill } from "./logic";
import { LIFE } from "./content";
import { LIFE_EVENTS, lifeEventById, type LifeChoice, type LifeEventDef } from "./events-content";
import type { PhaseId } from "../time/config";
import { applyJobDeadlines } from "../jobs/deadlines";

export type LifeStep = {
  state: CareerState;
  events: GameEvent[];
  skipDays: number;
  skipMinutes: number;
  bubble: string | null;
  warns: string[];
};

const STORY_AT: Record<number, string> = { 3: "landlord_remind", 7: "landlord_knock" };

export function defaultFeed(snapshot: LifeFeed["snapshot"]): LifeFeed {
  return {
    pity: 0,
    pityCountedDay: null,
    smallEventDay: null,
    cooldowns: {},
    flags: [],
    pendingId: null,
    queuedStoryId: null,
    deferredRoll: false,
    notices: [],
    nextBugDelta: 0,
    hackathonStart: null,
    hackathonResolved: false,
    snapshot,
    diary: null,
    purse: emptyPurse(),
    bannerDay: null,
    landlordTold: 0,
    sickOpen: false,
    burnoutOpen: false,
    storeAsked: false,
  };
}

export function feedOf(state: CareerState): LifeFeed {
  return state.feed ?? defaultFeed({
    day: state.players.game_day || 1,
    money: state.players.money,
    xp: 0,
    health: state.players.health,
    mood: state.players.mood,
    energy: state.players.energy,
  });
}

export function withFeed(state: CareerState, feed: LifeFeed): CareerState {
  return { ...state, feed };
}

export function rollChance(pity: number): number {
  const clamped = Math.max(0, Math.min(LIFE_EVENTS.pity_cap, pity));
  return LIFE_EVENTS.roll_p + clamped * LIFE_EVENTS.pity_step;
}

/** End of a slot after the first one (06:00–08:00). Sleep never calls this. */
export function slotCanRoll(minuteOfDay: number): boolean {
  return slotIndexFromWake(minuteOfDay) >= 2;
}

export function totalSkillXp(state: CareerState, catalog: SimCatalog): number {
  let total = 0;
  for (const skill of state.player_skills) {
    total += skill.xp;
    for (let level = 1; level < skill.level; level += 1) {
      total += xpToNextLevel(level, catalog.skillLevelXp);
    }
  }
  return total;
}

export function unreadCount(state: CareerState): number {
  let count = 0;
  for (const notice of feedOf(state).notices) {
    if (!notice.read) count += 1;
  }
  return count;
}

function step(state: CareerState, extra?: Partial<LifeStep>): LifeStep {
  return {
    state,
    events: extra?.events ?? [],
    skipDays: extra?.skipDays ?? 0,
    skipMinutes: extra?.skipMinutes ?? 0,
    bubble: extra?.bubble ?? null,
    warns: extra?.warns ?? [],
  };
}

function pushNotice(feed: LifeFeed, notice: LifeNotice): LifeFeed {
  if (feed.notices.some((row) => row.id === notice.id)) return feed;
  const notices = [...feed.notices, notice];
  const cap = LIFE_EVENTS.notice_cap;
  return { ...feed, notices: notices.length > cap ? notices.slice(notices.length - cap) : notices };
}

function warnFor(notice: LifeNotice, terminalOpen: boolean): string[] {
  if (!terminalOpen || notice.severity === "info") return [];
  return [`> WARN: ${notice.text}`];
}

function eventWeight(event: LifeEventDef, mood: number): number {
  if (event.good && mood < LIFE_EVENTS.good_mood_below) return event.weight * LIFE_EVENTS.good_weight;
  return event.weight;
}

export function eligibleSmallEvents(state: CareerState, phase: PhaseId, day: number): LifeEventDef[] {
  const feed = feedOf(state);
  const stage = state.players.stage;
  return LIFE_EVENTS.events.filter((event) => {
    if (!event.stages.includes(stage as "student")) return false;
    if (!event.phases.includes(phase)) return false;
    if (day < (feed.cooldowns[event.id] ?? 0)) return false;
    if (event.friday && !isDeployFriday(day)) return false;
    if (event.flagAbsent && feed.flags.includes(event.flagAbsent)) return false;
    if (event.id === "hackathon" && feed.hackathonStart != null && !feed.hackathonResolved) return false;
    return event.weight > 0;
  });
}

export function pickWeighted(events: readonly LifeEventDef[], mood: number, rng: () => number): LifeEventDef | null {
  let total = 0;
  const weights = events.map((event) => {
    const weight = eventWeight(event, mood);
    total += weight;
    return weight;
  });
  if (total <= 0) return null;
  let cursor = rng() * total;
  for (let i = 0; i < events.length; i += 1) {
    cursor -= weights[i] ?? 0;
    if (cursor < 0) return events[i] ?? null;
  }
  return events[events.length - 1] ?? null;
}

function lastCompletedPay(state: CareerState): number {
  let pay = 0;
  let day = -1;
  for (const job of state.player_jobs) {
    if (job.status !== "completed") continue;
    const finished = job.finished_day ?? 0;
    if (finished >= day) {
      day = finished;
      pay = job.pay;
    }
  }
  return pay;
}

function grantSoftXp(state: CareerState, amount: number, catalog: SimCatalog): { state: CareerState; events: GameEvent[] } {
  const skillId: SkillId = "soft";
  const current = state.player_skills.find((row) => row.skill_id === skillId) ?? {
    skill_id: skillId,
    level: 1,
    xp: 0,
  };
  const applied = addSkillXp(current, scaleXpForMood(amount, state.players.mood), catalog.skillLevelXp);
  const skills = state.player_skills.some((row) => row.skill_id === skillId)
    ? state.player_skills.map((row) => (row.skill_id === skillId ? applied.skill : row))
    : [...state.player_skills, applied.skill];
  return {
    state: { ...state, player_skills: skills },
    events: skillXpEvents(skillId, applied, catalog.config.rank_brackets),
  };
}

function highestSkill(state: CareerState): SkillId {
  let best: SkillId = SKILL_IDS[0];
  let level = 0;
  for (const id of SKILL_IDS) {
    const skill = state.player_skills.find((row) => row.skill_id === id);
    const value = skill?.level ?? 1;
    if (value > level) {
      level = value;
      best = id;
    }
  }
  return best;
}

function maxLevel(state: CareerState): number {
  let level = 1;
  for (const skill of state.player_skills) {
    if (skill.level > level) level = skill.level;
  }
  return level;
}

export function hackathonWinChance(maxSkillLevel: number): number {
  return LIFE_EVENTS.hackathon_base + LIFE_EVENTS.hackathon_per_level * Math.max(0, maxSkillLevel);
}

function applyPayRent(state: CareerState): CareerState | null {
  const life = lifeOf(state);
  const day = state.players.game_day;
  const key = monthKey(day);
  if (life.rentIssuedKey !== key || life.paidRentKey === key) return state;
  const rent = stageBill(LIFE.rent, state.players.stage);
  if (state.players.money < rent) return null;
  const paid = applyEventStats(state, { money: -rent });
  return notePurse(
    { ...paid.state, life: { ...lifeOf(paid.state), paidRentKey: key, rentDebtDays: 0 } },
    -rent,
    "rent",
  );
}

function applyChoiceEffects(
  state: CareerState,
  choice: LifeChoice,
  catalog: SimCatalog,
  rng: () => number,
): LifeStep {
  let next = state;
  const events: GameEvent[] = [];
  let skipDays = 0;
  const feed = { ...feedOf(next), flags: [...feedOf(next).flags] };

  if (choice.payRent) {
    const paid = applyPayRent(next);
    if (!paid) return step(state);
    next = paid;
  }

  let money = choice.money ?? 0;
  const basePay = lastCompletedPay(next);
  if (choice.recoverPayRatio) money += Math.round(basePay * choice.recoverPayRatio);
  if (choice.quotePayRatio) money += Math.round(basePay * choice.quotePayRatio);
  const stats = applyEventStats(next, {
    money,
    energy: choice.energy,
    health: choice.health,
    mood: choice.mood,
  });
  next = money !== 0 ? notePurse(stats.state, money, money > 0 ? "earn" : "other") : stats.state;
  events.push(...stats.events);
  skipDays = Math.max(skipDays, stats.skipDays);

  let reputation = choice.reputation ?? 0;
  if (choice.repChance != null && rng() < choice.repChance) {
    reputation += choice.repChanceAmount ?? 0;
  }
  if (reputation !== 0) {
    next = {
      ...next,
      players: { ...next.players, reputation: Math.max(0, next.players.reputation + reputation) },
    };
  }

  if (choice.softXp && choice.softXp > 0) {
    const granted = grantSoftXp(next, choice.softXp, catalog);
    next = granted.state;
    events.push(...granted.events);
  }

  if (choice.bugDelta) feed.nextBugDelta += choice.bugDelta;
  if (choice.bugChance != null && rng() < choice.bugChance) feed.nextBugDelta += 1;
  if (choice.setFlags) {
    for (const flag of choice.setFlags) {
      if (!feed.flags.includes(flag)) feed.flags.push(flag);
    }
  }
  if (choice.joinHackathon && feed.hackathonStart == null) {
    feed.hackathonStart = next.players.game_day;
    feed.hackathonResolved = false;
  }

  const opened = openQueued(withFeed(next, feed));
  return step(opened, {
    events,
    skipDays,
    skipMinutes: choice.loseSlot ? LIFE.slot_hours * 60 : 0,
  });
}

function openQueued(state: CareerState): CareerState {
  const feed = feedOf(state);
  if (feed.pendingId || !feed.queuedStoryId) return state;
  return withFeed(state, { ...feed, pendingId: feed.queuedStoryId, queuedStoryId: null });
}

function rememberEvent(feed: LifeFeed, event: LifeEventDef, day: number, minute: number): { feed: LifeFeed; notice: LifeNotice } {
  const story = event.id.startsWith("landlord_");
  const marked: LifeFeed = {
    ...feed,
    smallEventDay: story ? feed.smallEventDay : day,
    pity: story ? feed.pity : 0,
    cooldowns: story ? feed.cooldowns : { ...feed.cooldowns, [event.id]: day + LIFE_EVENTS.cooldown_days },
  };
  return makeNotice(marked, {
    id: `event-${day}-${event.id}`,
    day,
    minute,
    severity: story && event.id === "landlord_knock" ? "urgent" : "info",
    icon: event.icon,
    text: event.text,
    action: null,
    read: false,
    cue: event.id === "landlord_knock" ? "landlordKnock" : "eventOpen",
  });
}

function presentChoice(feed: LifeFeed, eventId: string, terminalOpen: boolean): LifeFeed {
  if (feed.pendingId) return { ...feed, queuedStoryId: feed.queuedStoryId ?? eventId };
  if (terminalOpen) return { ...feed, queuedStoryId: eventId };
  return { ...feed, pendingId: eventId };
}

function makeNotice(feed: LifeFeed, notice: LifeNotice): { feed: LifeFeed; notice: LifeNotice } {
  return { feed: pushNotice(feed, notice), notice };
}

export function rollSmallEvent(
  state: CareerState,
  phase: PhaseId,
  day: number,
  minute: number,
  terminalOpen: boolean,
  rng: () => number,
  catalog: SimCatalog,
): LifeStep {
  const feed = feedOf(state);
  if (terminalOpen) return step(withFeed(state, { ...feed, deferredRoll: true }));
  if (feed.pendingId || feed.smallEventDay === day) return step(state);
  if (rng() >= rollChance(feed.pity)) return step(state);
  const picked = pickWeighted(eligibleSmallEvents(state, phase, day), state.players.mood, rng);
  if (!picked) return step(state);
  const remembered = rememberEvent(feed, picked, day, minute);
  if (picked.kind === "buff") {
    const choice = picked.choices[0] ?? { id: "apply", text: "" };
    const applied = applyChoiceEffects(withFeed(state, remembered.feed), choice, catalog, rng);
    return { ...applied, bubble: picked.text, warns: warnFor(remembered.notice, false) };
  }
  return step(withFeed(state, presentChoice(remembered.feed, picked.id, false)), {
    warns: warnFor(remembered.notice, false),
  });
}

/** Debug-only. Ignores the daily cap and the roll chance, still respects stage, phase, and cooldown. */
export function forceSmallEvent(
  state: CareerState,
  phase: PhaseId,
  day: number,
  minute: number,
  catalog: SimCatalog,
): LifeStep {
  const cleared = withFeed(state, { ...feedOf(state), smallEventDay: null, pendingId: null });
  const picked = pickWeighted(eligibleSmallEvents(cleared, phase, day), cleared.players.mood, () => 0);
  if (!picked) return step(state);
  const remembered = rememberEvent(feedOf(cleared), picked, day, minute);
  if (picked.kind === "buff") {
    const choice = picked.choices[0] ?? { id: "apply", text: "" };
    const applied = applyChoiceEffects(withFeed(cleared, remembered.feed), choice, catalog, () => 0);
    return { ...applied, bubble: picked.text };
  }
  return step(withFeed(cleared, presentChoice(remembered.feed, picked.id, false)));
}

export function chooseLifeEvent(
  state: CareerState,
  choiceId: string,
  catalog: SimCatalog,
  rng: () => number,
): LifeStep {
  const feed = feedOf(state);
  const event = feed.pendingId ? lifeEventById(feed.pendingId) : null;
  if (!event) return step(state);
  const choice = event.choices.find((row) => row.id === choiceId);
  if (!choice) return step(state);
  if (choice.payRent && applyPayRent(state) == null && event.id.startsWith("landlord_")) {
    return step(state);
  }
  const cleared = withFeed(state, { ...feed, pendingId: null });
  const applied = applyChoiceEffects(cleared, choice, catalog, rng);
  if (event.id === "headhunter" && choice.setFlags?.includes("offerChain")) {
    const noted = pushNotice(feedOf(applied.state), {
      id: "headhunter",
      day: state.players.game_day,
      minute: state.players.game_minute,
      severity: "info",
      icon: "icon_notif_job.png",
      text: "Headhunter để lại lời nhắn.",
      action: "viewJobs",
      read: false,
    });
    return { ...applied, state: withFeed(applied.state, noted) };
  }
  return applied;
}

export function noteEmptyDay(state: CareerState, endedDay: number): CareerState {
  if (endedDay < 1) return state;
  const feed = feedOf(state);
  if (feed.pityCountedDay === endedDay) return state;
  const empty = feed.smallEventDay !== endedDay;
  return withFeed(state, {
    ...feed,
    pityCountedDay: endedDay,
    pity: empty ? Math.min(LIFE_EVENTS.pity_cap, feed.pity + 1) : feed.pity,
  });
}

export function queueLandlord(state: CareerState, day: number, minute: number, terminalOpen: boolean): LifeStep {
  const life = lifeOf(state);
  const storyId = STORY_AT[life.rentDebtDays];
  if (!storyId) return step(state);
  const feed = feedOf(state);
  if (feed.landlordTold >= life.rentDebtDays) return step(state);
  const event = lifeEventById(storyId);
  if (!event) return step(state);
  const remembered = rememberEvent({ ...feed, landlordTold: life.rentDebtDays }, event, day, minute);
  return step(withFeed(state, presentChoice(remembered.feed, event.id, terminalOpen)), {
    warns: warnFor(remembered.notice, terminalOpen),
  });
}

export function resolveHackathon(
  state: CareerState,
  day: number,
  catalog: SimCatalog,
  rng: () => number,
): LifeStep {
  const feed = feedOf(state);
  if (feed.hackathonStart == null || feed.hackathonResolved) return step(state);
  if (day < feed.hackathonStart + 3) return step(state);
  const won = rng() < hackathonWinChance(maxLevel(state));
  let next = withFeed(state, { ...feed, hackathonResolved: true });
  const events: GameEvent[] = [];
  if (won) {
    const paid = applyEventStats(next, { money: LIFE_EVENTS.hackathon_prize });
    next = notePurse(paid.state, LIFE_EVENTS.hackathon_prize, "earn");
    events.push(...paid.events);
    const skillId = highestSkill(next);
    const current = next.player_skills.find((row) => row.skill_id === skillId) ?? {
      skill_id: skillId,
      level: 1,
      xp: 0,
    };
    const applied = addSkillXp(current, scaleXpForMood(LIFE_EVENTS.hackathon_xp, next.players.mood), catalog.skillLevelXp);
    next = {
      ...next,
      player_skills: next.player_skills.map((row) => (row.skill_id === skillId ? applied.skill : row)),
    };
    events.push(...skillXpEvents(skillId, applied, catalog.config.rank_brackets));
  }
  const text = won ? "Hackathon có giải." : "Hackathon không có giải.";
  const noted = pushNotice(feedOf(next), {
    id: `hackathon-${feed.hackathonStart}`,
    day,
    minute: 6 * 60,
    severity: "info",
    icon: "icon_notif_money.png",
    text,
    action: null,
    read: false,
  });
  return step(withFeed(next, noted), { events });
}

export function syncLifeSurface(state: CareerState, day: number, minute: number, terminalOpen: boolean): LifeStep {
  const settled = applyJobDeadlines(state, day, minute);
  let feed = feedOf(settled);
  const warns: string[] = [];
  const add = (notice: LifeNotice) => {
    const before = feed.notices.length;
    feed = pushNotice(feed, notice);
    if (feed.notices.length !== before) warns.push(...warnFor(notice, terminalOpen));
  };

  const sick = settled.players.health < LIFE.sick_below;
  if (sick && !feed.sickOpen) {
    feed = { ...feed, sickOpen: true };
    add({
      id: `sick-${day}`,
      day,
      minute,
      severity: "warn",
      icon: "icon_notif_sick.png",
      text: `Sức khỏe dưới ${LIFE.sick_below}.`,
      action: "sleep",
      read: false,
      cue: "sickCough",
    });
  } else if (!sick && feed.sickOpen) {
    feed = { ...feed, sickOpen: false };
  }

  const burned = feedOf(settled).burnoutOpen;
  const burnout = settled.players.mood < LIFE.burnout_below || lifeOf(settled).burnoutDay === day;
  if (burnout && !burned) {
    feed = { ...feed, burnoutOpen: true };
    add({
      id: `burnout-${day}`,
      day,
      minute,
      severity: "urgent",
      icon: "icon_notif_burnout.png",
      text: "Kiệt sức, chưa nhận freelance.",
      action: null,
      read: false,
    });
  } else if (!burnout && feed.burnoutOpen) {
    feed = { ...feed, burnoutOpen: false };
  }

  if (calendar(day).dayOfMonth === LIFE.days_per_month) {
    add({
      id: `rent-soon-${monthKey(day)}`,
      day,
      minute,
      severity: "info",
      icon: "icon_notif_rent.png",
      text: "Mai đóng tiền trọ.",
      action: null,
      read: false,
    });
  }

  if (holidayOn(day) === "black_friday") {
    add({
      id: `bf-${monthKey(day)}`,
      day,
      minute,
      severity: "info",
      icon: "icon_notif_sale.png",
      text: "Black Friday, cửa hàng giảm giá.",
      action: "openStore",
      read: false,
    });
  }

  const ready = pinReady(settled);
  if (ready) {
    add({
      id: `pin-ready-${ready.id}`,
      day,
      minute,
      severity: "info",
      icon: "icon_notif_store.png",
      text: `Đủ tiền ${ready.label}.`,
      action: "openStore",
      read: false,
    });
  }

  const completed = new Set(
    settled.player_jobs.filter((job) => job.status === "completed").map((job) => job.template_id),
  );
  for (const job of settled.player_jobs) {
    if (job.status === "offered" && completed.has(job.template_id)) {
      add({
        id: `regular-${job.id}`,
        day,
        minute,
        severity: "info",
        icon: "icon_notif_job.png",
        text: "Khách quen có job.",
        action: "viewJobs",
        read: false,
      });
    }
  }

  return step(withFeed(settled, feed), { warns });
}

export function noticesForBills(before: CareerState, after: CareerState, day: number, minute: number): LifeStep {
  const prev = lifeOf(before);
  const next = lifeOf(after);
  let feed = feedOf(after);
  const warns: string[] = [];
  const add = (notice: LifeNotice) => {
    const size = feed.notices.length;
    feed = pushNotice(feed, notice);
    if (feed.notices.length !== size && notice.severity !== "info") warns.push(`> WARN: ${notice.text}`);
  };
  const key = monthKey(day);
  if (next.paidSalaryKey === key && prev.paidSalaryKey !== key) {
    add({
      id: `salary-${key}`,
      day,
      minute,
      severity: "info",
      icon: "icon_notif_salary.png",
      text: "Lương về.",
      action: null,
      read: false,
      cue: "salary",
    });
  }
  if (next.paidUtilitiesKey === key && prev.paidUtilitiesKey !== key) {
    add({
      id: `bill-${key}`,
      day,
      minute,
      severity: "info",
      icon: "icon_notif_bill.png",
      text: "Tiền điện nước.",
      action: null,
      read: false,
    });
  }
  if (next.rentDebtDays > prev.rentDebtDays && next.paidRentKey !== key) {
    const severity: NoticeSeverity = next.rentDebtDays >= 7 ? "urgent" : "warn";
    add({
      id: `rent-late-${key}-${next.rentDebtDays}`,
      day,
      minute,
      severity,
      icon: "icon_notif_rent.png",
      text: `Trễ trọ ngày ${next.rentDebtDays}, tinh thần −3.`,
      action: "payRent",
      read: false,
    });
  }
  return step(withFeed(after, feed), { warns });
}

export function openDiary(
  state: CareerState,
  catalog: SimCatalog,
  slept?: { day: number; clock: string } | null,
): CareerState {
  const feed = feedOf(state);
  const xp = totalSkillXp(state, catalog);
  const line = LIFE_EVENTS.diary_lines[(state.players.game_day - 1) % LIFE_EVENTS.diary_lines.length] ?? "";
  const books = diaryBooks(feed.snapshot.money, state.players.money, feed.purse);
  const diary: LifeDiary = {
    day: state.players.game_day,
    money: books.money,
    xp: xp - feed.snapshot.xp,
    health: state.players.health - feed.snapshot.health,
    mood: state.players.mood - feed.snapshot.mood,
    energy: state.players.energy - feed.snapshot.energy,
    line,
    pin: pinProgressLine(state),
    earned: books.earned,
    spent: books.spent,
    food: books.food,
    rent: books.rent,
    shop: books.shop,
    remaining: books.remaining,
    sleptDay: slept ? slept.day : null,
    sleptAt: slept && /^\d{2}:\d{2}$/.test(slept.clock) ? slept.clock : null,
  };
  return withFeed(state, { ...feed, diary });
}

/** Notepad date line: holiday, weekday, and the clock the player went to sleep. */
export function diaryWhen(diary: LifeDiary): string {
  const day = diary.sleptDay ?? diary.day;
  const parts: string[] = [];
  if (holidayOn(day)) parts.push("Ngày lễ");
  parts.push(calendar(day).weekdayLabel);
  if (diary.sleptAt) parts.push(`ngủ lúc ${diary.sleptAt}`);
  return parts.join(" · ");
}

export function captureSnapshot(state: CareerState, catalog: SimCatalog): CareerState {
  const feed = feedOf(state);
  return withFeed(state, {
    ...feed,
    snapshot: {
      day: state.players.game_day,
      money: state.players.money,
      xp: totalSkillXp(state, catalog),
      health: state.players.health,
      mood: state.players.mood,
      energy: state.players.energy,
    },
    purse: emptyPurse(),
  });
}

export function payOutstandingRent(state: CareerState): LifeStep {
  const paid = applyPayRent(state);
  if (!paid || paid === state) return step(state);
  const day = paid.players.game_day;
  const noted = pushNotice(feedOf(paid), {
    id: `rent-paid-${monthKey(day)}`,
    day,
    minute: paid.players.game_minute,
    severity: "info",
    icon: "icon_notif_rent.png",
    text: "Đã trả trọ.",
    action: null,
    read: false,
  });
  return step(withFeed(paid, noted));
}

export function markNoticeRead(state: CareerState, id: string): CareerState {
  const feed = feedOf(state);
  return withFeed(state, {
    ...feed,
    notices: feed.notices.map((notice) => (notice.id === id ? { ...notice, read: true } : notice)),
  });
}

export function markAllNoticesRead(state: CareerState): CareerState {
  const feed = feedOf(state);
  return withFeed(state, { ...feed, notices: feed.notices.map((notice) => ({ ...notice, read: true })) });
}

export function dismissDiary(state: CareerState): CareerState {
  return withFeed(state, { ...feedOf(state), diary: null });
}

export function askStore(state: CareerState): CareerState {
  return withFeed(state, { ...feedOf(state), storeAsked: true });
}

export function bannerForDay(state: CareerState, day: number): { state: CareerState; label: string | null } {
  const holiday = holidayOn(day);
  if (!holiday) return { state, label: null };
  const feed = feedOf(state);
  if (feed.bannerDay === day) return { state, label: null };
  return {
    state: withFeed(state, { ...feed, bannerDay: day }),
    label: holidayLabelSafe(holiday),
  };
}

function holidayLabelSafe(id: string): string {
  return LIFE_EVENTS.holiday_labels[id] ?? id;
}

export function flushDeferred(
  state: CareerState,
  phase: PhaseId,
  day: number,
  minute: number,
  rng: () => number,
  catalog: SimCatalog,
): LifeStep {
  let feed = feedOf(state);
  let next = state;
  const events: GameEvent[] = [];
  let bubble: string | null = null;
  const warns: string[] = [];
  if (feed.deferredRoll) {
    next = withFeed(next, { ...feed, deferredRoll: false });
    const rolled = rollSmallEvent(next, phase, day, minute, false, rng, catalog);
    next = rolled.state;
    events.push(...rolled.events);
    bubble = rolled.bubble;
    warns.push(...rolled.warns);
    feed = feedOf(next);
  }
  if (!feed.pendingId && feed.queuedStoryId) {
    next = openQueued(next);
  }
  return step(next, { events, bubble, warns });
}

export function takePendingBugDelta(state: CareerState): { state: CareerState; delta: number } {
  const feed = feedOf(state);
  if (!feed.nextBugDelta) return { state, delta: 0 };
  return { state: withFeed(state, { ...feed, nextBugDelta: 0 }), delta: feed.nextBugDelta };
}
