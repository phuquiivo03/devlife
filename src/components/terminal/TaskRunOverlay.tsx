"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { playCueKey, startLoopKey, stopLoopKey } from "@/game/audio/client";
import { typingLoopKey } from "@/game/audio/cues";
import { SIM_CATALOG } from "@/game/career/content";
import { formatVnd } from "@/lib/format-currency";
import { jobTimeScale } from "@/game/life/traits";
import { TASK_RUN, taskDurationSec } from "@/game/task-run/content";
import { taskEventFlash } from "@/game/task-run/formula";
import { bugHitPx, bugMotionRand, spawnBugs, stepBug, type BugBody } from "@/game/task-run/motion";
import { canRetry } from "@/game/task-run/machine";
import { primarySkillId, ticketForSkill } from "@/game/task-run/apply";
import type { TaskRun } from "@/game/task-run/types";
import { useGameStore } from "@/game/state/store";
import { Term } from "./Term";
import { TerminalWindow } from "./TerminalWindow";

function skillLabel(skillId: string): string {
  return SIM_CATALOG.skills.find((row) => row.id === skillId)?.name ?? skillId;
}

export function TaskRunOverlay() {
  const timeScale = useGameStore((s) => jobTimeScale(s.career));
  const jobId = useGameStore((s) => s.taskJobId);
  const job = useGameStore((s) => s.career.player_jobs.find((row) => row.id === jobId));
  const closeTask = useGameStore((s) => s.closeTask);
  const terminalLines = useGameStore((s) => s.terminalLines);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jobId) return;
    dialogRef.current?.focus();
    playCueKey("panelOpen");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTask();
        return;
      }
      if (event.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const items = [...root.querySelectorAll<HTMLElement>("button:not([disabled])")];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      stopLoopKey();
      playCueKey("panelClose");
    };
  }, [jobId, closeTask]);

  if (!jobId || !job?.task_run) return null;
  const template = SIM_CATALOG.jobTemplates.find((row) => row.id === job.template_id);
  if (!template) return null;
  const skillId = primarySkillId(job.template_id, SIM_CATALOG);
  const ticket = ticketForSkill(skillId, TASK_RUN.tickets);
  if (!ticket) return null;

  const status =
    job.task_run.step === "result"
      ? job.task_run.outcome === "success"
        ? "[ok] xong"
        : "[fail] chưa giao"
      : "đang làm task";

  return (
    <div className="absolute inset-0 z-30 flex min-h-0 flex-col bg-black/55 p-2 sm:p-3">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-terminal-title"
        tabIndex={-1}
        className="min-h-0 flex-1 outline-none"
      >
        <h2 id="task-terminal-title" className="sr-only">
          Task {template.name}
        </h2>
        <TerminalWindow status={status}>
          {terminalLines.length > 0 ? (
            <ul data-testid="terminal-warns" style={flashStyle()}>
              {terminalLines.map((line) => (
                <li key={line} className={line.startsWith("> WARN:") ? "terminal-event-warn" : "terminal-sage"}>
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
          {job.task_run.step === "ticket" ? (
            <TicketStep
              title={ticket.title}
              quote={ticket.quote}
              pay={job.pay}
              difficulty={ticket.difficulty_label}
              skillId={skillId}
              prompt={ticket.prompt}
              timeScale={timeScale}
            />
          ) : null}
          {job.task_run.step === "build" ? <BuildStep run={job.task_run} timeScale={timeScale} /> : null}
          {job.task_run.step === "test" ? <TestStep run={job.task_run} timeScale={timeScale} /> : null}
          {job.task_run.step === "result" ? (
            <ResultStep
              run={job.task_run}
              jobId={job.id}
              templateId={template.id}
              pay={job.pay}
              reputation={template.reputation_gain}
              skillId={skillId}
              failed={job.status === "failed"}
            />
          ) : null}
        </TerminalWindow>
      </div>
    </div>
  );
}

function TicketStep({
  title,
  quote,
  pay,
  difficulty,
  skillId,
  prompt,
  timeScale,
}: {
  title: string;
  quote: string;
  pay: number;
  difficulty: string;
  skillId: string;
  prompt: string;
  timeScale: number;
}) {
  const choose = useGameStore((s) => s.chooseTicket);
  const ticket = TASK_RUN.tickets.find((row) => row.skill_id === skillId) ?? TASK_RUN.tickets[0];
  return (
    <div data-testid="task-step-ticket">
      <p className="terminal-prompt">$ cat ticket.md</p>
      <p className="terminal-sage">
        <Term id="ticket">ticket</Term> = phiếu yêu cầu của khách
      </p>
      <p className="mt-3"># {title}</p>
      <p className="terminal-sage">Khách viết: “{quote}”</p>
      <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-y-1">
        <dt className="terminal-sage">thưởng</dt>
        <dd>{formatVnd(pay)}</dd>
        <dt className="terminal-sage">
          <Term id="deadline">hạn chót</Term>
        </dt>
        <dd>{Math.round(taskDurationSec(TASK_RUN) * timeScale)} giây</dd>
        <dt className="terminal-sage">kỹ năng</dt>
        <dd>
          <Term id={skillId}>{skillId}</Term>
          <span className="terminal-sage"> ({skillLabel(skillId)})</span>
        </dd>
        <dt className="terminal-sage">độ khó</dt>
        <dd>{difficulty}</dd>
      </dl>
      <p className="mt-4">? {prompt}</p>
      <div className="mt-2 flex flex-col">
        {ticket?.choices.map((choice, index) => (
          <button
            key={choice.id}
            type="button"
            className="terminal-cmd"
            data-testid={`task-choice-${choice.id}`}
            onClick={() => choose(choice.id)}
          >
            [{index + 1}] {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BuildStep({ run, timeScale }: { run: TaskRun; timeScale: number }) {
  const choose = useGameStore((s) => s.chooseBuild);
  const begin = useGameStore((s) => s.beginTaskTest);
  const event = TASK_RUN.events.find((row) => row.id === run.event_id) ?? null;
  const [progress, setProgress] = useState(run.build ? TASK_RUN.choice_at : 0);
  const [showChoice, setShowChoice] = useState(false);
  const [logCount, setLogCount] = useState(1);

  const preChoice = Math.max(
    1,
    TASK_RUN.build_sec * timeScale +
      (run.ticket === "ask" ? TASK_RUN.ask_extra_sec : 0) +
      (event?.time_delta_sec ?? 0),
  );

  useEffect(() => {
    const sync = () => {
      if (document.hidden) {
        stopLoopKey();
        return;
      }
      startLoopKey(typingLoopKey(run.build));
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [run.build]);

  useEffect(() => {
    return () => stopLoopKey();
  }, []);

  useEffect(() => {
    if (run.build) return;
    let elapsed = 0;
    const stopAt = preChoice * TASK_RUN.choice_at;
    const id = window.setInterval(() => {
      elapsed += 0.1;
      setProgress(Math.min(TASK_RUN.choice_at, elapsed / preChoice));
      setLogCount(Math.min(TASK_RUN.build_logs.length, 1 + Math.floor(elapsed / 1.6)));
      if (elapsed >= stopAt) {
        window.clearInterval(id);
        setShowChoice(true);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [preChoice, run.build]);

  useEffect(() => {
    if (!run.build) return;
    let elapsed = 0;
    const delta = run.build === "careful" ? TASK_RUN.careful_extra_sec : TASK_RUN.rushed_extra_sec;
    const after = Math.max(1.2, preChoice * (1 - TASK_RUN.choice_at) + delta);
    const id = window.setInterval(() => {
      elapsed += 0.1;
      const t = Math.min(1, elapsed / after);
      setProgress(TASK_RUN.choice_at + (1 - TASK_RUN.choice_at) * t);
      setLogCount(TASK_RUN.build_logs.length);
      if (t >= 1) {
        window.clearInterval(id);
        stopLoopKey();
        begin();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [begin, preChoice, run.build]);

  const logs = TASK_RUN.build_logs.slice(0, logCount);
  const percent = Math.round(progress * 100);

  return (
    <div data-testid="task-step-build">
      <p className="terminal-prompt">
        $ npm run <Term id="build">build</Term>
      </p>
      <div className="terminal-bar mt-3" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} role="progressbar">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="terminal-sage mt-1">{percent}% · còn {Math.max(0, Math.ceil((1 - progress) * preChoice))}s</p>
      <ul className="mt-3 space-y-1">
        {logs.map((line) => (
          <li key={line} className="terminal-sage">
            {line}
          </li>
        ))}
        {event && progress > 0.15 ? <EventFlash event={event} /> : null}
      </ul>
      {showChoice && !run.build ? (
        <div className="terminal-popup mt-4" data-testid="task-build-choice">
          <p>? Làm tiếp theo cách nào</p>
          <button type="button" className="terminal-cmd" data-testid="task-build-careful" onClick={() => choose("careful")}>
            ./lam-ky chậm +{TASK_RUN.careful_extra_sec}s · ít bug hơn
          </button>
          <button type="button" className="terminal-cmd" data-testid="task-build-rushed" onClick={() => choose("rushed")}>
            ./lam-au nhanh {TASK_RUN.rushed_extra_sec}s · dễ sinh bug
          </button>
          <p className="terminal-sage mt-2">
            <Term id="bug">bug</Term> = lỗi khiến sản phẩm chạy sai
          </p>
        </div>
      ) : null}
      {run.build ? <p className="terminal-sage mt-3">đang đóng gói nốt…</p> : null}
    </div>
  );
}

function flashStyle(): CSSProperties {
  return {
    ["--terminal-blinks" as string]: TASK_RUN.terminal_warn_blinks,
    ["--terminal-error-blinks" as string]: TASK_RUN.terminal_error_blinks,
    ["--terminal-blink-ms" as string]: `${TASK_RUN.terminal_blink_ms}ms`,
    ["--terminal-shake-ms" as string]: `${TASK_RUN.terminal_shake_ms}ms`,
  };
}

function EventFlash({ event }: { event: (typeof TASK_RUN.events)[number] }) {
  const flash = taskEventFlash(event, TASK_RUN.error_text);
  return (
    <>
      {flash.warning ? (
        <li className="terminal-event-warn" data-testid="terminal-event-warn" style={flashStyle()}>
          {flash.warning}
        </li>
      ) : null}
      {flash.error ? (
        <li className="terminal-event-error" data-testid="terminal-event-error" style={flashStyle()}>
          {flash.error}
        </li>
      ) : null}
      <li className="terminal-sage">{event.log}</li>
    </>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function TestStep({ run, timeScale }: { run: TaskRun; timeScale: number }) {
  const catchTaskBug = useGameStore((s) => s.catchTaskBug);
  const finishTaskTest = useGameStore((s) => s.finishTaskTest);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const randRef = useRef<(() => number) | null>(null);
  if (!randRef.current) {
    randRef.current = bugMotionRand(run.seed + run.retries);
  }
  const [bugs, setBugs] = useState<BugBody[]>(() =>
    spawnBugs(run.seed + run.retries, run.bugs_total, TASK_RUN.bug_motion),
  );
  const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set());
  const [left, setLeft] = useState(TASK_RUN.test_sec * timeScale);
  const hit = bugHitPx(TASK_RUN.bug_motion);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const rand = randRef.current;
      if (rand) {
        setBugs((current) => current.map((bug) => stepBug(bug, dt, TASK_RUN.bug_motion, rand, reducedRef.current)));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft((current) => {
        const next = Math.max(0, Math.round((current - 0.1) * 10) / 10);
        if (next <= 0) {
          window.clearInterval(id);
          finishTaskTest();
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [finishTaskTest]);

  return (
    <div data-testid="task-step-test">
      <p className="terminal-prompt">
        $ npm <Term id="test">test</Term>
      </p>
      <p className="terminal-sage">
        Bắt <Term id="bug">bug</Term> trước khi hết giờ. Còn {left.toFixed(0)}s · {run.bugs_total - hidden.size} con
      </p>
      <div className="relative mt-3">
        <pre className="terminal-code">{TASK_RUN.test_code.join("\n")}</pre>
        {bugs.map((bug, index) =>
          hidden.has(index) ? null : (
            <button
              key={index}
              type="button"
              className="terminal-bug"
              data-size={bug.size}
              style={{
                left: `${bug.x}%`,
                top: `${bug.y}%`,
                width: hit,
                height: hit,
                marginLeft: -hit / 2,
                marginTop: -hit / 2,
              }}
              aria-label="Bắt bug"
              data-testid="task-bug"
              onClick={() => {
                setHidden((current) => {
                  const next = new Set(current);
                  next.add(index);
                  return next;
                });
                catchTaskBug();
              }}
            >
              <i
                style={{
                  width: TASK_RUN.bug_motion.sizes[bug.size].px,
                  height: Math.round(TASK_RUN.bug_motion.sizes[bug.size].px * 0.75),
                }}
              />
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function ResultStep({
  run,
  jobId,
  templateId,
  pay,
  reputation,
  skillId,
  failed,
}: {
  run: TaskRun;
  jobId: string;
  templateId: string;
  pay: number;
  reputation: number;
  skillId: string;
  failed: boolean;
}) {
  const retry = useGameStore((s) => s.retryTaskRun);
  const close = useGameStore((s) => s.closeTask);
  const energy = useGameStore((s) => s.career.players.energy);
  const events = useGameStore((s) => s.career.player_events);
  const success = run.outcome === "success";
  const xp = xpForJob(events, jobId);
  const showRetry = canRetry(run, TASK_RUN.max_retries) && !failed;
  const canPayRetry = energy >= TASK_RUN.retry_energy;

  return (
    <div data-testid="task-step-result" data-outcome={success ? "success" : "fail"}>
      <p className="terminal-prompt">$ ./giao-hang</p>
      {success ? (
        <>
          <p>[ok] Đã giao cho khách</p>
          <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-1">
            <dt className="terminal-sage">tiền công</dt>
            <dd>{pay > 0 ? `+${formatVnd(pay)}` : "0đ"}</dd>
            <dt className="terminal-sage">kinh nghiệm</dt>
            <dd>
              +{xp} XP <Term id={skillId}>{skillId}</Term>
            </dd>
            <dt className="terminal-sage">danh tiếng</dt>
            <dd>+{reputation}</dd>
          </dl>
        </>
      ) : (
        <>
          <p>
            [fail] <Term id="bug">bug</Term> lọt lên <Term id="prod">prod</Term>
          </p>
          <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-1">
            <dt className="terminal-sage">tiền công</dt>
            <dd>0đ</dd>
            <dt className="terminal-sage">danh tiếng</dt>
            <dd>{failed ? `-${TASK_RUN.fail_reputation}` : "0 · còn một lần"}</dd>
          </dl>
          <p className="terminal-sage mt-2">Khách: “Bản này chạy sai.”</p>
          {showRetry ? (
            <button
              type="button"
              className="terminal-cmd"
              data-testid="task-retry"
              disabled={!canPayRetry}
              onClick={() => retry()}
            >
              ./retry tốn {TASK_RUN.retry_energy} năng lượng
              {canPayRetry ? "" : " · không đủ"}
            </button>
          ) : null}
        </>
      )}
      <button type="button" className="terminal-cmd" data-testid="task-close" onClick={() => close()}>
        đóng [esc]
      </button>
      <p className="terminal-sage mt-4">{templateId}</p>
    </div>
  );
}

function xpForJob(
  events: readonly { type: string; payload: Record<string, unknown> }[],
  jobId: string,
): number {
  let start = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    const row = events[i];
    if (row && row.type === "taskSucceeded" && row.payload.jobId === jobId) {
      start = i;
      break;
    }
  }
  if (start < 0) return 0;
  let sum = 0;
  for (let i = start + 1; i < events.length; i++) {
    const row = events[i];
    if (!row || row.type !== "skillXpGained") continue;
    const amount = Number(row.payload.amount);
    if (Number.isFinite(amount)) sum += amount;
  }
  return sum;
}
