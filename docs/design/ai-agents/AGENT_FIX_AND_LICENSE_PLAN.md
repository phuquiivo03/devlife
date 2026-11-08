# Agent fix stuck — diagnosis + fix plan (P1), monthly license plan (P2)

Branch `cursor/ai-agent-trio-stage1-4275`, PR #94. Analysis at remote head `e9a9a50`
(user commit "update Agent name, shop text style"). Agent names below follow that
commit (Cờlốt / Củsỏ / Câupilot); do not rename.

P2 starts only after P1 is merged into this branch and its tests pass.

**P1 status:** implemented (see commit after `5aeccd1`). Smoke: 8/8 with `--workers=1`.

---

## P1 — "Agent fix bug" screen stuck, no visible progress

### Reproduction (live browser, real timers, no clock mocking)

Seed: smoke fixture with one job at `bug_choice`, careful trait (timeScale 1.1),
fixer Câupilot (m 1.1) → expected fix time `10 × 1.1 × 1.1 = 12.1s`.
Flow: Việc làm → job → Tiếp tục → `task-fix-agent-copilot_inspired`. Poll `devlife:v1`.

| Job | t | step | revision | fixed | fix_partial.left | UI |
| --- | --- | --- | --- | --- | --- | --- |
| 1 bug | 0.3s | agent_fix | 1 | 0/1 | – | "Đang sửa bug… ~12s" |
| 1 bug | 1s | agent_fix | 2 | 0/1 | 0.0413 | same |
| 1 bug | 8s | agent_fix | 9 | 0/1 | 0.0413 | same |
| 1 bug | 25s | agent_fix | 27 | 0/1 | 0.0413 | same (stuck, > 2× expected) |
| 3 bugs | 1s | **ready** | 2 | 3/3 | – | jumps to ready after ~0.5s |

`0.0413 = 0.5 / 12.1` = one tick of work, then frozen forever. Revision climbs ~1/s.

Pure reducer probe (same payloads the UI sends) matches exactly: 1 bug freezes at
`partial = 0.5/T` even after `checkpoint(1)`; 2+ bugs (or "2 of 3 fixed manually")
go straight to `ready` on the first tick.

### Cause 1 — `checkpointAgentFix` spends *remaining* work, not *done* work

`src/game/task-run/transitions.ts` `checkpointAgentFix`:

```ts
const remaining = Math.max(0, remainingFixWork(run) - workDone); // work LEFT after this tick
let workLeft = remaining * total;                                 // used as budget to spend
// need = weight (= 1/total) per bug
```

- The budget is the work still left, so it is large at the start and 0 at the end
  (inverted).
- Units differ: `workLeft` is "fraction × N", `need` is "fraction" (1/N).
- Result: N ≥ 2 → every bug fixed on the first tick. N = 1 → `0.983 < 1`, so partial is
  set to `w`; next tick `remaining = w − w = 0` → budget 0 → no change, forever.
  `checkpoint(1)` gives `remaining = 0` → also a no-op.

### Cause 2 — UI timer restarts on every checkpoint, can never reach the end

`src/components/terminal/task-run/AgentFlowSteps.tsx` `AgentFixStep`:

- The effect deps include `run.revision`; `checkpointAgentFix` calls `bumpRevision` on
  every checkpoint → the effect tears down and restarts with `elapsed = 0` every ~0.5s.
  `elapsed >= total` is never reached, so the final `checkpoint(1)` never fires.
- Text is the constant `~{total}s`; no countdown or `fixed/total` → "no visible progress".
- `workDone = elapsed / total` is passed as if absolute, but the reducer treats it as a
  delta against `remainingFixWork(run)` → wrong either way after a restart.

Why the earlier smoke missed it: `task bug choice desktop` stops at a screenshot of
`bug_choice` and never clicks an agent fixer. No unit test calls `checkpointAgentFix`.

### Fix plan (implement with Composer 2.5)

1. **Reducer** `checkpointAgentFix(state, jobId, revision, workDelta)`:
   - `workDelta` = fraction of the *whole* fix pass done since the last checkpoint
     (clamp to `[0, 1]`). Budget `b = workDelta` (fraction units).
   - For each unfixed bug in `bug_ids` order: `need = (partial?.bug_id === id ? partial.left : 1) × weight`.
     If `b >= need − 1e-9`: push id, `partial = null`, `b −= need`; else
     `partial = { bug_id: id, left: (need − b) / weight }`, `b = 0`, stop.
   - **Do not `bumpRevision` on progress** (same as `checkpointBuildProgress`). Bump only when
     transitioning to `ready`. Revision stays the stale-decision guard.
   - `bug_ids.length === 0` or nothing left → go to `ready` (no silent no-op).
2. **`chooseTaskFixer`**: if an agent is chosen and `remainingFixWork(run) === 0`, go to `ready`.
3. **`AgentFixStep`**:
   - Effect deps: `live`, `run.step`, `run.fixer_id`, `total` — not `run.revision`.
   - Every 100 ms (skip when `document.hidden`): accumulate `pending += 0.1 / total`;
     every 0.5 s send `checkpoint(pending)` and reset `pending`. Flush `pending` on cleanup.
   - Display from store state: `còn ~{ceil(remainingFixWork(run) × total)}s` and
     `đã sửa {fixed}/{bug_ids.length}` — must change at least every second.
   - Guard `total` with `Math.max(0.1, …)`.
4. Store `checkpointTaskAgentFix` keeps `taskLive=false` on `ready`; reading `run.revision`
   from the current state stays correct because progress no longer bumps it.

Out of scope: subscription changes, agent names/fonts, `CustomizePanel`.

### Regression tests

Unit `tests/unit/agent-fix.test.ts` (reducer, deterministic):

- N = 1: feed `0.5/T` deltas → not ready until cumulative ≥ 1 − ε, ready at
  `ceil(T/0.5)` calls; `fix_partial.left` strictly decreases.
- N = 3: first tick **not** ready; `fixed` monotonic; ready when cumulative ≥ 1.
- 2 of 3 already fixed by manual → needs exactly 1/3 more work.
- Progress checkpoint keeps `revision`; stale revision still ignored after a decision.
- `switchTaskFixerBack` mid-fix then re-pick agent keeps `fix_partial` / `fixed_bug_ids`.

E2E real timers `tests/e2e/agents-runtime-smoke.spec.ts` (new fixture jobs
`smoke-fix-1bug`, `smoke-fix-3bug` at `bug_choice` in `agent-smoke-persist.json` +
`scripts/e2e/seed-agent-smoke.ts`):

- Click fixer; within 2 s the visible "còn ~Ns" value decreases (progress visible).
- `task-step-ready` **not** visible at `0.5 × T` (catches the instant-complete bug).
- `task-step-ready` visible by `T + 3 s` where `T = test_sec × careful 1.1 × Câupilot 1.1`
  is computed from config in the test, not hard-coded. Then **Xong** pays once.
- Both 1-bug and 3-bug jobs.

Commands after the fix:

```bash
pnpm vitest run tests/unit/agent-fix.test.ts tests/unit/agents.test.ts tests/unit/taskRun.test.ts
pnpm exec playwright test tests/e2e/agents-runtime-smoke.spec.ts --workers=1   # twice
pnpm typecheck && pnpm lint && pnpm build && pnpm vitest run
```

Expected unit baseline: only the 3 known failures from `main`
(`audio.test.ts`, `notice-actions.test.ts`, `traits.test.ts`).

---

## P2 — Agent license lasts 1 in-game month (plan only)

### Calendar convention

The game has a month: `LIFE.days_per_month = 28` (`config/life_sim.json`), used by
`calendar()` / `monthKey()` and payday. A license lasts **28 in-game days, rolling from
the purchase day** (not aligned to the calendar month, no real-world clock).
Add `license_days: 28` to `config/agents.json` so balance can tune it.

### State + semantics

- `AgentsState` gains `licenses: Partial<Record<AgentId, { bought_day: number; expires_day: number }>>`.
  `owned` stays as the "ever bought" list for history and UI ordering.
- Buy on day `d` → `expires_day = d + license_days`. Usable while
  `game_day < expires_day` (usable days `d … d+27`, expires at the start of day `d+28`).
- `agentActive(state, id) = license && players.game_day < expires_day`.
  `daysLeft = expires_day − game_day`.
- Replace `ownsAgent` call sites that gate **use** (begin, choose fixer, select/bug-choice
  lists, `anyAgentOwned` for the `bug_choice` step) with `agentActive`.

### Purchase / repurchase

- `agentBuyBlock`: block "Còn N ngày" while active; allow when expired or never bought.
- Repurchase on expiry sets new `bought_day = today`, `expires_day = today + 28`.
  No stacking or early renewal (keeps it simple; avoids double charge).
- Idempotent: same action twice in one tick → second call sees active license and is blocked
  (same pattern as today's "Đã có."). Buy UI keeps the confirm step.
- **No auto-renewal, no automatic charges.** Expiry only adds a notice.

### Expiry while a task is in progress (no deadlock)

- A run already started keeps working: `task_run.coder` is a snapshot, and the current
  `build` / `agent_fix` step finishes with the agent it started with. The check happens
  only when the player makes a **new** decision (begin, choose fixer).
- If the license expired, the bug-choice list hides that agent; **manual** is always shown,
  so the run can always reach `ready`.
- `ready` → **Xong** never checks licenses: reward and the no-double-pay guard stay as now.
- On `onDayStarted`, for each license that just expired (`expires_day === today`) push
  one notice "License {name} đã hết hạn — mua lại trong Cửa hàng" (action `openStore`),
  de-duped with a feed flag per `agentId:expires_day`.

### UI

- Shop card: active → "Còn N ngày" (coral when ≤ 3); expired → "Hết hạn" + **Mua lại**;
  never bought → **Mua**. Keep the user's current labels/fonts in `AgentShopGrid`.
- "Đã sở hữu" tab lists active licenses with days left; expired ones show "Hết hạn".
- Select / bug-choice: only active agents; inline hint when some license has expired.

### Save migration (PERSIST 27 → 28)

- For each id in `owned` with no license: grant a fresh license from the migrated
  `game_day` (`expires_day = game_day + 28`) — a grace month, so nobody loses access on load.
- Invalid or unknown ids dropped by `normalizeAgents`; tests for v27 → v28 and idempotent
  re-migration.

### Tests (P2)

Unit: buy sets the window; active on day `d+27`, inactive on `d+28`; buy blocked while
active, allowed after expiry; double buy charges once; mid-build expiry still completes and
**Xong** pays once; expired agent hidden from bug choice but manual still reaches `ready`;
expiry notice once; migration grace. E2E: seeded expired license shows "Hết hạn" + Mua lại.
