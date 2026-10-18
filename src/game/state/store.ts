"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Loadout, StageId } from "../types";
import { PERSIST_KEY, PERSIST_VERSION } from "../config";
import { getCatalog, getRoom } from "../content";
import {
  applyDayStarted,
  applyStudy,
  applyWake,
  changeMoney,
  defaultCareer,
  ensureTodayBoard as ensureBoardState,
  fillEnergy,
  grantRawXp,
  syncPlayerClock,
  xpNeededForNextLevel,
} from "../career/actions";
import { SIM_CATALOG } from "../career/content";
import type { CareerState, Notice, NoticeActionId } from "../career/types";
import { playCueKey } from "../audio/client";
import type { CueKey } from "../audio/cues";
import {
  beginTest,
  catchBug,
  chooseBuild,
  chooseTicket,
  finishTest,
  retryTask,
  startTask,
} from "../task-run/apply";
import type { TaskBuildChoice, TaskTicketChoice } from "../task-run/types";
import { gameBus } from "../events/bus";
import type { GameEvent } from "../events/types";
import { LocalStorageAdapter, toStateStorage } from "../storage/adapter";
import { migrateSave } from "../storage/migrate";
import {
  DEFAULT_START_MINUTES,
  MINUTES_PER_DAY,
  SLEEP_WAKE_MINUTE,
  advanceMinutes,
  canSleepAt,
  minutesForPhaseStart,
  seekMinutes,
  sleepToNextMorning,
  snapshot,
  timeBus,
  type PhaseId,
  type SpeedPreset,
} from "../time";
import type { FoodId } from "../life/content";
import { crossWakingSlot, eatMeal, hoursUntilWake, mealBlocked, resolveMorning } from "../life/logic";
import { rollTrait } from "../life/traits";
import { LIFE_EVENTS } from "../life/events-content";
import {
  askStore,
  bannerForDay,
  captureSnapshot,
  chooseLifeEvent,
  dismissDiary,
  feedOf,
  flushDeferred,
  forceSmallEvent,
  markAllNoticesRead,
  markNoticeRead,
  noteEmptyDay,
  noticesForBills,
  openDiary,
  payOutstandingRent,
  queueLandlord,
  resolveHackathon,
  rollSmallEvent,
  slotCanRoll,
  syncLifeSurface as syncLifeSurfaceState,
} from "../life/events";
import type { LifeStep } from "../life/events";
import { dialogCueKey, noticeCueKey, pickMomentCue, playLifeSound } from "../life/sounds";
import { pinItem, roomOwned } from "../life/furniture";
import { buyShopItem } from "../life/store-buy";
import { acceptJobFromNotice, dismissNoticeById, noticeForAction, tickJobOffers } from "../jobs/offers";

let clockSkip = false;
let handlingHospital = false;

function playLifeTransition(previous: CareerState, result: LifeStep, extra: readonly CueKey[] = []) {
  const before = feedOf(previous);
  const after = feedOf(result.state);
  const seen = new Set(before.notices.map((notice) => notice.id));
  const keys: CueKey[] = [...extra];
  for (const notice of after.notices) {
    if (seen.has(notice.id)) continue;
    keys.push(noticeCueKey(notice));
  }
  if (after.pendingId && after.pendingId !== before.pendingId) {
    keys.push(dialogCueKey(after.pendingId));
  } else if (result.bubble) {
    keys.push("eventOpen");
  }
  const cue = pickMomentCue(keys);
  if (cue) playCueKey(cue);
}

function commitLife(result: LifeStep, extraCues: readonly CueKey[] = []) {
  const current = useGameStore.getState();
  playLifeTransition(current.career, result, extraCues);
  const warns = current.taskJobId ? result.warns : [];
  useGameStore.setState({
    career: result.state,
    terminalLines: warns.length ? [...current.terminalLines, ...warns].slice(-8) : current.terminalLines,
    lifeBubble: result.bubble
      ? { text: result.bubble, until: Date.now() + LIFE_EVENTS.bubble_ms }
      : current.lifeBubble,
  });
  emitGame(result.events);
  maybeHospital(result.skipDays);
  if (result.skipMinutes > 0) {
    clockSkip = true;
    const advanced = advanceMinutes(useGameStore.getState().totalMinutes, result.skipMinutes);
    useGameStore.setState({ totalMinutes: advanced.totalMinutes });
    for (const event of advanced.events) timeBus.emit(event);
    clockSkip = false;
  }
}

function emitGame(events: readonly GameEvent[]) {
  for (const event of events) gameBus.emit(event);
}

function maybeHospital(skipDays: number | undefined) {
  if (!skipDays || skipDays <= 0 || handlingHospital) return;
  handlingHospital = true;
  clockSkip = true;
  const current = useGameStore.getState().totalMinutes;
  const snap = snapshot(current);
  const target = (snap.day - 1 + skipDays) * MINUTES_PER_DAY + SLEEP_WAKE_MINUTE;
  const result = seekMinutes(current, Math.max(target, current + 1));
  useGameStore.setState({ totalMinutes: result.totalMinutes });
  for (const event of result.events) timeBus.emit(event);
  clockSkip = false;
  handlingHospital = false;
  const landed = snapshot(result.totalMinutes);
  const morning = resolveMorning(useGameStore.getState().career, landed.day);
  useGameStore.setState({ career: morning.state });
  emitGame(morning.events);
}

export type CareerPanel = "study" | "jobs" | "skills";

type GameState = {
  stage: StageId;
  loadouts: Record<StageId, Loadout>;
  showCharacter: boolean;
  selectedSlot: string | null;
  hoveredSlot: string | null;
  cameraX: Record<StageId, number | null>;
  customizeOpen: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setStage: (s: StageId) => void;
  setSlotItem: (slotId: string, itemId: string | null) => void;
  cycleVariant: (slotId: string, dir: 1 | -1) => void;
  resetStage: () => void;
  selectSlot: (id: string | null) => void;
  setHover: (id: string | null) => void;
  setShowCharacter: (v: boolean) => void;
  dismissIntro: () => void;
  setCameraX: (stage: StageId, x: number | null) => void;
  setCustomizeOpen: (v: boolean) => void;
  /** In-game minutes since day 1, 00:00. Persisted. */
  totalMinutes: number;
  /** Dev speed. Not persisted. */
  clockSpeed: SpeedPreset;
  /** Dev pause. Not persisted. */
  clockPaused: boolean;
  setTotalMinutes: (minutes: number) => void;
  setClockSpeed: (speed: SpeedPreset) => void;
  setClockPaused: (paused: boolean) => void;
  sleep: () => void;
  jumpToPhase: (phaseId: PhaseId) => void;
  career: CareerState;
  careerPanel: CareerPanel | null;
  fastForward: boolean;
  openCareerPanel: (panel: CareerPanel) => void;
  closeCareerPanel: () => void;
  ensureTodayBoard: () => void;
  onDayStarted: (day: number, totalMinutes: number) => void;
  onWake: (fromTotalMinutes: number) => void;
  onHour: (hour: number, totalMinutes: number) => void;
  buyCourse: (activityId: string, force?: boolean) => void;
  eat: (foodId: FoodId) => void;
  /** Job whose CRT task is on screen. Not persisted. */
  taskJobId: string | null;
  acceptJob: (jobId: string, force?: boolean) => void;
  openTask: (jobId: string) => void;
  closeTask: () => void;
  chooseTicket: (choice: TaskTicketChoice) => void;
  chooseBuild: (choice: TaskBuildChoice) => void;
  beginTaskTest: () => void;
  catchTaskBug: () => void;
  finishTaskTest: () => void;
  retryTaskRun: () => void;
  /** Ephemeral life UI. Not persisted. */
  storeOpen: boolean;
  /** Ăn uống modal. Not persisted. */
  foodOpen: boolean;
  lifeBubble: { text: string; until: number } | null;
  lifeBanner: { label: string; until: number } | null;
  terminalLines: string[];
  chooseLife: (choiceId: string) => void;
  readNotice: (id: string) => void;
  readAllNotices: () => void;
  dismissDiary: () => void;
  runNoticeAction: (id: NoticeActionId, notice?: Notice) => void;
  setStoreOpen: (open: boolean) => void;
  setFoodOpen: (open: boolean) => void;
  buyStoreItem: (id: string) => void;
  pinStoreItem: (id: string | null) => void;
  debugForceEvent: () => void;
  syncLifeSurface: () => void;
  debugAddMoney: () => void;
  debugFillEnergy: () => void;
  debugLevelUp: () => void;
};

const emptyLoadouts = (): Record<StageId, Loadout> => ({
  student: {},
  junior: {},
  senior: {},
});

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      stage: "student",
      loadouts: emptyLoadouts(),
      showCharacter: true,
      selectedSlot: null,
      hoveredSlot: null,
      cameraX: { student: null, junior: null, senior: null },
      customizeOpen: false,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setStage: (s) => {
        const current = get();
        if (!roomOwned(current.career, s) || current.stage === s) return;
        set({
          stage: s,
          selectedSlot: null,
          career: { ...current.career, players: { ...current.career.players, stage: s } },
        });
      },
      setSlotItem: (slotId, itemId) => {
        const stage = get().stage;
        set((st) => ({
          loadouts: {
            ...st.loadouts,
            [stage]: { ...st.loadouts[stage], [slotId]: itemId },
          },
        }));
      },
      cycleVariant: (slotId, dir) => {
        const stage = get().stage;
        const room = getRoom(stage);
        const slot = room.slots.find((s) => s.id === slotId);
        if (!slot) return;
        const { items } = getCatalog();
        const variants = items.filter((i) => slot.accepts.includes(i.category));
        if (variants.length === 0) return;
        const current =
          get().loadouts[stage][slotId] ?? slot.default ?? variants[0]!.id;
        const idx = variants.findIndex((v) => v.id === current);
        const next =
          variants[(idx + dir + variants.length) % variants.length]!.id;
        get().setSlotItem(slotId, next);
      },
      resetStage: () => {
        const stage = get().stage;
        set((st) => ({
          loadouts: { ...st.loadouts, [stage]: {} },
        }));
      },
      selectSlot: (id) => set({ selectedSlot: id }),
      setHover: (id) => set({ hoveredSlot: id }),
      setShowCharacter: (v) => set({ showCharacter: v }),
      dismissIntro: () => {
        const career = get().career;
        set({
          career: { ...career, players: { ...career.players, introSeen: true } },
        });
      },
      setCameraX: (stage, x) =>
        set((st) => ({ cameraX: { ...st.cameraX, [stage]: x } })),
      setCustomizeOpen: (v) => set({ customizeOpen: v }),
      totalMinutes: DEFAULT_START_MINUTES,
      clockSpeed: 1,
      clockPaused: false,
      setTotalMinutes: (minutes) =>
        set({
          totalMinutes:
            typeof minutes === "number" && Number.isFinite(minutes)
              ? Math.max(0, minutes)
              : DEFAULT_START_MINUTES,
        }),
      setClockSpeed: (speed) => set({ clockSpeed: speed }),
      setClockPaused: (paused) => set({ clockPaused: paused }),
      sleep: () => {
        const current = get().totalMinutes;
        if (!canSleepAt(current)) return;
        const result = sleepToNextMorning(current);
        clockSkip = true;
        set({ totalMinutes: result.totalMinutes });
        for (const event of result.events) timeBus.emit(event);
        clockSkip = false;
      },
      jumpToPhase: (phaseId) => {
        const current = get().totalMinutes;
        const target = minutesForPhaseStart(current, phaseId);
        const result = seekMinutes(current, target);
        set({ totalMinutes: result.totalMinutes });
        for (const event of result.events) timeBus.emit(event);
      },
      career: defaultCareer(1, DEFAULT_START_MINUTES, "student", SIM_CATALOG, rollTrait()),
      careerPanel: null,
      taskJobId: null,
      storeOpen: false,
      foodOpen: false,
      lifeBubble: null,
      lifeBanner: null,
      terminalLines: [],
      fastForward: false,
      openCareerPanel: (panel) => set({ careerPanel: panel }),
      closeCareerPanel: () => set({ careerPanel: null }),
      ensureTodayBoard: () => {
        const current = get();
        const snap = snapshot(current.totalMinutes);
        const synced = syncPlayerClock(
          current.career,
          snap.day,
          snap.minuteOfDay,
          current.stage,
        );
        const result = ensureBoardState(synced, snap.day, SIM_CATALOG);
        set({ career: result.state });
        emitGame(result.events);
      },
      onDayStarted: (day, totalMinutes) => {
        const current = get();
        const minuteOfDay = snapshot(totalMinutes).minuteOfDay;
        const before = current.career;
        const result = applyDayStarted(before, day, minuteOfDay, current.stage, SIM_CATALOG, {
          resolveMorning: minuteOfDay === SLEEP_WAKE_MINUTE && !clockSkip,
        });
        const bills = noticesForBills(before, result.state, day, minuteOfDay);
        const emptied = noteEmptyDay(bills.state, day - 1);
        const hack = resolveHackathon(emptied, day, SIM_CATALOG, Math.random);
        const surface = syncLifeSurfaceState(hack.state, day, minuteOfDay, current.taskJobId != null);
        const banner = bannerForDay(surface.state, day);
        const landlord = queueLandlord(banner.state, day, minuteOfDay, current.taskJobId != null);
        const dayCues: CueKey[] = [];
        if (banner.label) {
          set({ lifeBanner: { label: banner.label, until: Date.now() + LIFE_EVENTS.banner_ms } });
          dayCues.push("eventOpen");
        }
        commitLife(
          {
            state: landlord.state,
            events: [...result.events, ...hack.events, ...landlord.events],
            skipDays: Math.max(result.skipDays ?? 0, hack.skipDays, landlord.skipDays),
            skipMinutes: 0,
            bubble: null,
            warns: [...bills.warns, ...surface.warns, ...landlord.warns],
          },
          dayCues,
        );
      },
      onWake: (fromTotalMinutes) => {
        const slept = snapshot(fromTotalMinutes);
        const diary = openDiary(get().career, SIM_CATALOG, { day: slept.day, clock: slept.clockLabel });
        playCueKey("diaryFlip");
        const result = applyWake(diary, hoursUntilWake(snapshot(fromTotalMinutes).minuteOfDay));
        const snapped = captureSnapshot(result.state, SIM_CATALOG);
        set({ career: snapped });
        emitGame(result.events);
        maybeHospital(result.skipDays);
      },
      onHour: (hour, totalMinutes) => {
        if (clockSkip) return;
        const snap = snapshot(totalMinutes);
        if (snap.minute !== 0 || hour % 2 !== 0) return;
        if (hour === 6) {
          const morning = resolveMorning(get().career, snap.day);
          const offered = tickJobOffers(morning.state, snap.day, snap.minuteOfDay);
          const surface = syncLifeSurfaceState(offered, snap.day, snap.minuteOfDay, get().taskJobId != null);
          commitLife({
            state: surface.state,
            events: [...morning.events, ...surface.events],
            skipDays: morning.skipDays,
            skipMinutes: 0,
            bubble: null,
            warns: surface.warns,
          });
          return;
        }
        const crossed = crossWakingSlot(get().career, snap.minuteOfDay);
        const offered = tickJobOffers(crossed.state, snap.day, snap.minuteOfDay);
        let rolled = {
          state: offered,
          events: [] as GameEvent[],
          skipDays: 0,
          skipMinutes: 0,
          bubble: null as string | null,
          warns: [] as string[],
        };
        if (slotCanRoll(snap.minuteOfDay)) {
          rolled = rollSmallEvent(
            offered,
            snap.phaseId,
            snap.day,
            snap.minuteOfDay,
            get().taskJobId != null,
            Math.random,
            SIM_CATALOG,
          );
        }
        const surface = syncLifeSurfaceState(rolled.state, snap.day, snap.minuteOfDay, get().taskJobId != null);
        commitLife({
          state: surface.state,
          events: [...crossed.events, ...rolled.events, ...surface.events],
          skipDays: Math.max(crossed.skipDays, rolled.skipDays),
          skipMinutes: rolled.skipMinutes,
          bubble: rolled.bubble,
          warns: [...rolled.warns, ...surface.warns],
        });
      },
      eat: (foodId) => {
        const current = get().career;
        if (mealBlocked(current, foodId)) return;
        const result = eatMeal(current, foodId);
        set({ career: result.state });
        emitGame(result.events);
        maybeHospital(result.skipDays);
        get().syncLifeSurface();
      },
      buyCourse: (activityId, force = false) => {
        const current = get();
        const snapNow = snapshot(current.totalMinutes);
        const synced = syncPlayerClock(
          current.career,
          snapNow.day,
          snapNow.minuteOfDay,
          current.stage,
        );
        const result = applyStudy(synced, activityId, SIM_CATALOG, force);
        if (result.error) return;
        const advanced = advanceMinutes(current.totalMinutes, result.minutes);
        const snap = snapshot(advanced.totalMinutes);
        set({
          totalMinutes: advanced.totalMinutes,
          career: syncPlayerClock(result.state, snap.day, snap.minuteOfDay, current.stage),
          fastForward: true,
        });
        emitGame(result.events);
        for (const event of advanced.events) timeBus.emit(event);
        maybeHospital(result.skipDays);
        get().syncLifeSurface();
        window.setTimeout(() => {
          useGameStore.setState({ fastForward: false });
        }, 800);
      },
      acceptJob: (jobId, force = false) => {
        const current = get();
        const snap = snapshot(current.totalMinutes);
        const synced = syncPlayerClock(
          current.career,
          snap.day,
          snap.minuteOfDay,
          current.stage,
        );
        const result = startTask(synced, jobId, SIM_CATALOG, force);
        if (result.error) {
          playCueKey("jobFailed");
          return;
        }
        set({ career: result.state, careerPanel: null, taskJobId: jobId });
        emitGame(result.events);
        maybeHospital(result.skipDays);
        get().syncLifeSurface();
      },
      openTask: (jobId) => set({ careerPanel: null, taskJobId: jobId }),
      closeTask: () => {
        set({ taskJobId: null, terminalLines: [] });
        const snap = snapshot(get().totalMinutes);
        commitLife(
          flushDeferred(get().career, snap.phaseId, snap.day, snap.minuteOfDay, Math.random, SIM_CATALOG),
        );
      },
      chooseLife: (choiceId) => {
        commitLife(chooseLifeEvent(get().career, choiceId, SIM_CATALOG, Math.random));
        get().syncLifeSurface();
      },
      readNotice: (id) => set({ career: markNoticeRead(get().career, id) }),
      readAllNotices: () => set({ career: markAllNoticesRead(get().career) }),
      dismissDiary: () => set({ career: dismissDiary(get().career) }),
      runNoticeAction: (id, notice) => {
        const picked = noticeForAction(get().career, id, notice);
        if (id === "payRent") {
          commitLife(payOutstandingRent(get().career));
          get().syncLifeSurface();
          return;
        }
        if (id === "viewJobs") {
          set({ careerPanel: "jobs" });
          return;
        }
        if (id === "openJobs") {
          const jobId = picked?.payload?.jobId;
          const job = jobId
            ? get().career.player_jobs.find((row) => row.id === jobId && row.status === "active")
            : undefined;
          if (job) {
            if (job.task_run) get().openTask(job.id);
            else get().acceptJob(job.id);
            return;
          }
          set({ careerPanel: "jobs" });
          return;
        }
        if (id === "openStore") {
          set({ storeOpen: true, career: askStore(get().career) });
          return;
        }
        if (id === "eat") {
          set({ foodOpen: true });
          return;
        }
        if (id === "sleep") {
          get().sleep();
          return;
        }
        if (id === "acceptJob") {
          set({ career: acceptJobFromNotice(get().career, picked ?? undefined) });
          return;
        }
        if (id === "dismissNotice") {
          set({ career: dismissNoticeById(get().career, picked ?? undefined) });
          return;
        }
        console.warn(`Unknown notice action "${id}"`);
      },
      setStoreOpen: (open) => set({ storeOpen: open }),
      setFoodOpen: (open) => set({ foodOpen: open }),
      buyStoreItem: (id) => {
        const bought = buyShopItem(get().career, id);
        if (bought.error) return;
        playLifeSound("sfx_store_buy");
        const stage = bought.moveTo ?? get().stage;
        set({
          stage,
          selectedSlot: bought.moveTo ? null : get().selectedSlot,
          career: bought.state,
        });
        emitGame(bought.events);
        get().syncLifeSurface();
      },
      pinStoreItem: (id) => {
        set({ career: pinItem(get().career, id) });
        get().syncLifeSurface();
      },
      debugForceEvent: () => {
        const snap = snapshot(get().totalMinutes);
        commitLife(forceSmallEvent(get().career, snap.phaseId, snap.day, snap.minuteOfDay, SIM_CATALOG));
      },
      syncLifeSurface: () => {
        const snap = snapshot(get().totalMinutes);
        const surface = syncLifeSurfaceState(get().career, snap.day, snap.minuteOfDay, get().taskJobId != null);
        const banner = bannerForDay(surface.state, snap.day);
        const bannerCues: CueKey[] = [];
        if (banner.label) {
          set({ lifeBanner: { label: banner.label, until: Date.now() + LIFE_EVENTS.banner_ms } });
          bannerCues.push("eventOpen");
        }
        commitLife({ ...surface, state: banner.state }, bannerCues);
      },
      chooseTicket: (choice) => {
        const id = get().taskJobId;
        if (!id) return;
        const result = chooseTicket(get().career, id, choice, SIM_CATALOG);
        if (result.error) return;
        set({ career: result.state });
        emitGame(result.events);
      },
      chooseBuild: (choice) => {
        const id = get().taskJobId;
        if (!id) return;
        const result = chooseBuild(get().career, id, choice, SIM_CATALOG);
        if (result.error) return;
        set({ career: result.state });
        emitGame(result.events);
      },
      beginTaskTest: () => {
        const id = get().taskJobId;
        if (!id) return;
        const result = beginTest(get().career, id);
        if (result.error) return;
        set({ career: result.state });
        emitGame(result.events);
      },
      catchTaskBug: () => {
        const id = get().taskJobId;
        if (!id) return;
        const result = catchBug(get().career, id, SIM_CATALOG);
        if (result.error) return;
        set({ career: result.state });
        emitGame(result.events);
      },
      finishTaskTest: () => {
        const id = get().taskJobId;
        if (!id) return;
        const result = finishTest(get().career, id, SIM_CATALOG);
        if (result.error) return;
        set({ career: result.state });
        emitGame(result.events);
      },
      retryTaskRun: () => {
        const id = get().taskJobId;
        if (!id) return;
        const result = retryTask(get().career, id, SIM_CATALOG);
        if (result.error) {
          playCueKey("locked");
          return;
        }
        set({ career: result.state });
        emitGame(result.events);
      },
      debugAddMoney: () => {
        const result = changeMoney(get().career, 500_000);
        set({ career: result.state });
        emitGame(result.events);
      },
      debugFillEnergy: () => {
        const result = fillEnergy(get().career, SIM_CATALOG);
        set({ career: result.state });
        emitGame(result.events);
      },
      debugLevelUp: () => {
        const need = xpNeededForNextLevel(get().career, "frontend", SIM_CATALOG);
        if (need <= 0) return;
        const result = grantRawXp(get().career, "frontend", need, SIM_CATALOG);
        set({ career: result.state });
        emitGame(result.events);
      },
    }),
    {
      name: PERSIST_KEY,
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => toStateStorage(new LocalStorageAdapter())),
      partialize: (s) => {
        const snap = snapshot(s.totalMinutes);
        return {
          stage: s.stage,
          loadouts: s.loadouts,
          showCharacter: s.showCharacter,
          totalMinutes: s.totalMinutes,
          career: syncPlayerClock(s.career, snap.day, snap.minuteOfDay, s.stage),
        };
      },
      migrate: (persisted, version) => migrateSave(persisted, version),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function buildSlotIndex(stage: StageId): Record<string, number> {
  const room = getRoom(stage);
  const out: Record<string, number> = {};
  room.slots.forEach((s, i) => {
    out[s.id] = i;
  });
  return out;
}
