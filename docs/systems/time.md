# Time system

The day/night clock is the first devlife sim system. It is framework-agnostic: React and Zustand only display it and persist it. Future systems (energy, rent, jobs) subscribe to the event bus and do not import the loop.

## Model

State is a single number, **total in-game minutes since day 1, 00:00**.

| Derived | Rule |
|---|---|
| Day | `floor(totalMinutes / 1440) + 1` (Ngày 1, Ngày 2, …) |
| Clock | `HH:MM` from the minute-of-day, floored |
| Phase | Looked up from [`src/game/time/config.ts`](../../src/game/time/config.ts) |

```ts
export const REAL_MS_PER_GAME_DAY = 10 * 60 * 1000; // 1 in-game day = 10 real minutes
```

At speed ×1 the clock advances `1440 / REAL_MS_PER_GAME_DAY` in-game minutes per real millisecond. A fresh save and any v1 save start at **day 1, 08:00** (`DEFAULT_START_MINUTES`).

### Phases

| Phase key | Label | Clock | Sleep | Placeholder |
|---|---|---|---|---|
| `morning` | Sáng | 06:00–12:00 | no | 🌅 |
| `noon` | Chiều | 12:00–18:00 | no | ☀️ |
| `evening` | Tối | 18:00–24:00 | yes | 🌆 |
| `night` | Đêm | 00:00–06:00 | yes | 🌙 |

The phase key is also the icon key. Bounds are inclusive at the start and exclusive at the end. Each phase has a `tint` (`{ r, g, b, a }`) drawn as a source-over wash on the room canvas. Slot budgets, late nights, and the calendar live in [life.md](./life.md).

Icons use the same files as the rest of the HUD: `public/ui/icons/icon_<key>.png` (44×44) and `icon_<key>_x4.png` (176×176) for `morning`, `noon`, `evening`, and `night`. Those eight files are already in the repo. The home page reads `public/ui/icons` when it renders and passes the filenames to the HUD. `resolveShippedIcon` picks the integer-scale variant the way `resolveIconAsset` does (22px on the HUD uses the ×4 file, an exact ÷8). The emoji stays only as a fallback when a file is missing, on an element stamped with `data-icon-key`. Dropping a replacement png into that folder and refreshing is enough — no code change.

Sleep skips to **06:00 the next day** (`SLEEP_WAKE_MINUTE`). It always increments the day, including when the clock is already past midnight. Speed presets are `1`, `10`, and `60`.

## Public API

Import from `@/game/time`.

```ts
import {
  snapshot,
  advanceMinutes,
  sleepToNextMorning,
  seekMinutes,
  canSleepAt,
  createTimeLoop,
  createTimeBus,
  timeBus,
  PHASES,
  REAL_MS_PER_GAME_DAY,
} from "@/game/time";

snapshot(totalMinutes);
// { day, hour, minute, minuteOfDay, phaseId, clockLabel, totalMinutes }

advanceMinutes(totalMinutes, deltaMinutes);
// { totalMinutes, events }

sleepToNextMorning(totalMinutes);
seekMinutes(from, to); // forward replays boundaries; backward teleports
```

`createTimeLoop` is the only ticker. Pass `getTotalMinutes` / `setTotalMinutes`, `getSpeed`, `isPaused`, and `emit`. Call `tick(nowMs)` with a monotonic clock. `commit()` writes a fractional minute that has not crossed a boundary yet (used on tab hide).

The React hook `useGameClock` in `src/components/game/useGameClock.ts` owns the `requestAnimationFrame` loop and is started after the Zustand save hydrates.

## Events

`timeBus` emits these, in order, when several boundaries land on the same minute:

1. `minute` — `{ totalMinutes, day, hour, minute, count }`
2. `hourChanged` — `{ day, hour, totalMinutes }`
3. `phaseChanged` — `{ phase, previous, day, totalMinutes }`
4. `dayStarted` — `{ day, totalMinutes }`

`sleep` is separate: `{ fromTotalMinutes, toTotalMinutes, day }`. A sleep skip does **not** emit one `minute` per skipped minute (so a slot tick does not run overnight). It does emit `hourChanged`, `phaseChanged`, and `dayStarted` for the wake time, then `sleep`. Energy is restored by the `sleep` listener from hours asleep (`E = min(Emax, E + 12.5h)`), not by `dayStarted`.

`count` on `minute` is `1` during normal play. If one tick crosses more than `MINUTE_EVENT_COALESCE_AFTER` minutes (two in-game days — a long background tab or ×60), minutes collapse to one event per hour segment and `count` is the size of that segment. Hour, phase, and day events are still emitted **once per boundary crossed**, in order. Summing `count` equals the number of in-game minutes that elapsed.

During a catch-up tick the store is updated to the **final** time before listeners run. Read the event payload for the boundary you were notified about, not the store.

`dayStarted` does not fire on page load. Read `snapshot` for the current day. It fires when play crosses midnight or when the player sleeps.

## Persistence

Zustand key `devlife:v1`, version **2**. Persisted fields: `stage`, `loadouts`, `showCharacter`, `totalMinutes`.

Version 0 and 1 saves have no clock. `migrate` sets `totalMinutes` to `DEFAULT_START_MINUTES`. A v2 value is kept when it is a finite number ≥ 0; anything else falls back to the default. Pause and speed are dev-only and are not saved, so a reload always resumes at ×1, unpaused, at the saved minute.

## UI

- Room status bar (above the canvas): phase icon and `Ngày N · weekday · HH:MM phase` (for example `Ngày 1 · T2 · 08:12 Sáng`). The HUD card keeps an icon-only **Đi ngủ** button (bed icon, tooltip “Đi ngủ”, no text label). Money is on that same bar, not repeated on the card.
- **UI Display-only fast-forward**: state jumps instantly (sleep, buyCourse, commitLife skipMinutes, hospital, jumpToPhase, playGame); status bar displays minutes rolling from old to new in 0,6s (≤4h) or 1,2s (longer), with "+Nh" pill, phase icon/label crossfade 0,4s, data-time/data-day/data-phase remain real values, data-display-time shows displayed value; reduced motion snaps.
- Đi ngủ is disabled during Sáng and Chiều. During Tối and Đêm it is enabled and `fx_zzz` floats above the bed (the first frame, still, when `prefers-reduced-motion` is set). Frame size, count, and the 900ms loop come from `public/ui/m5_1/anim.json` via `src/components/game/sleep-button.config.ts`.
- Room tint crossfades over `TINT_TRANSITION_MS` (snaps when reduced motion is set). The canvas itself stays pixelated; the wash is a flat fill before the integer upscale.
- Debug controls (development, or `?debug=1` in production): speed ×1 / ×10 / ×60, Tạm dừng / Tiếp tục, and a jump to each phase.

## Add a subscriber

```ts
import { timeBus } from "@/game/time";

// Restore energy and health when the player sleeps.
// Return the unsubscribe function from a startup module when the system is removed.
export function bindRestOnSleep() {
  return timeBus.on("sleep", (event) => {
    // event.day is the morning just started.
    // event.toTotalMinutes is 06:00 on that day.
    restoreEnergyAndHealth();
  });
}

function restoreEnergyAndHealth() {
  // owned by a future stats system — not the clock
}
```

Other typical hooks:

```ts
timeBus.on("phaseChanged", (event) => {
  if (event.phase === "night") queueNightEvent();
});

timeBus.on("dayStarted", (event) => {
  chargeRent(event.day);
});

timeBus.on("minute", (event) => {
  // event.count may be > 1 after a long catch-up.
  drainEnergy(event.count);
});
```

Keep handlers synchronous and cheap. They run on the animation frame that crossed the boundary. Do not call `sleep()` or `jumpToPhase()` from inside a handler.

## Add a phase

Edit `PHASES` in `src/game/time/config.ts` only. The array must cover every minute of the day exactly once (the unit test walks all 1440 minutes). Set `id` (also the icon key), `label`, `emoji`, `startMinute`, `endMinute`, `sleepAllowed`, and `tint`. No clock math needs to change. Wake-up time and the real-day length are the `SLEEP_WAKE_MINUTE` and `REAL_MS_PER_GAME_DAY` constants in that same file. A new phase icon is `public/ui/icons/icon_<id>.png` plus the `_x4` file.
