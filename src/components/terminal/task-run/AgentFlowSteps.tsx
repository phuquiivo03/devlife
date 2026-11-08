"use client";

import { useEffect, useRef, useState } from "react";
import { AGENTS, agentById, agentIconPath } from "@/game/agents/content";
import { agentShopUnlocked, ownsAgent } from "@/game/agents/logic";
import type { AgentId } from "@/game/agents/types";
import { TASK_RUN } from "@/game/task-run/content";
import { buildRemainingSec, agentFixTotalSec, manualBudgetSec } from "@/game/task-run/timing";
import type { TaskRun } from "@/game/task-run/types";
import { useGameStore } from "@/game/state/store";
import { formatVnd } from "@/lib/format-currency";
import { Term } from "../Term";

export function ResumeGate({ step }: { step: string }) {
  const resume = useGameStore((s) => s.resumeTask);
  const close = useGameStore((s) => s.closeTask);
  if (step === "select" || step === "result") return null;
  return (
    <div data-testid="task-resume-gate" className="mt-4">
      <p className="terminal-sage">Task đang tạm dừng — bấm Tiếp tục để chạy timer.</p>
      <button type="button" className="terminal-cmd" data-testid="task-resume" onClick={() => resume()}>
        Tiếp tục
      </button>
      <button type="button" className="terminal-cmd mt-2" onClick={() => close()}>
        đóng [esc]
      </button>
    </div>
  );
}

export function SelectStep({ jobId, pay, energyCost }: { jobId: string; pay: number; energyCost: number }) {
  const career = useGameStore((s) => s.career);
  const begin = useGameStore((s) => s.beginTask);
  const openStoreAgents = useGameStore((s) => s.openStoreAgents);
  const close = useGameStore((s) => s.closeTask);
  const unlocked = agentShopUnlocked(career);
  const owned = AGENTS.agents.filter((a) => ownsAgent(career, a.id as AgentId));

  return (
    <div data-testid="task-step-select">
      <p className="terminal-prompt">$ ./chon-coder</p>
      <p className="terminal-sage mt-2">
        Bắt đầu tốn {energyCost} năng lượng. Thưởng dự kiến {formatVnd(pay)} — chỉ nhận khi bấm <strong>Xong</strong>.
      </p>
      <button
        type="button"
        className="terminal-cmd mt-3"
        data-testid="task-begin-manual"
        onClick={() => begin({ mode: "manual" })}
      >
        [1] Tự làm (manual)
      </button>
      {unlocked ? (
        <>
          <p className="terminal-sage mt-4">Hoặc chọn agent đã mua:</p>
          {owned.length === 0 ? (
            <p className="terminal-sage">Chưa có license — mua trong Cửa hàng tab AI Agent.</p>
          ) : null}
          {owned.map((agent, index) => (
            <button
              key={agent.id}
              type="button"
              className="terminal-cmd flex items-center gap-2"
              data-testid={`task-pick-agent-${agent.id}`}
              onClick={() => begin({ mode: "agent", coderId: agent.id as AgentId })}
            >
              <img src={agentIconPath(agent.id as AgentId, 64)} width={32} height={32} alt="" />
              [{index + 2}] {agent.name} · {agent.chip}
            </button>
          ))}
        </>
      ) : (
        <p className="terminal-sage mt-4">Hoàn thành {AGENTS.gate_freelance_completed} việc freelance để mở agent.</p>
      )}
      <button type="button" className="terminal-cmd mt-3" data-testid="task-open-agent-shop" onClick={() => openStoreAgents()}>
        Mở cửa hàng AI
      </button>
      <button type="button" className="terminal-cmd mt-2" onClick={() => close()}>
        đóng [esc]
      </button>
    </div>
  );
}

export function AgentBuildStep({ run, timeScale }: { run: TaskRun; timeScale: number }) {
  const finish = useGameStore((s) => s.finishAgentBuild);
  const checkpoint = useGameStore((s) => s.checkpointTaskBuild);
  const takeover = useGameStore((s) => s.takeOverTaskBuild);
  const live = useGameStore((s) => s.taskLive);
  const event = TASK_RUN.events.find((row) => row.id === run.event_id) ?? null;
  const total = buildRemainingSec(run, timeScale, TASK_RUN.events);
  const [left, setLeft] = useState(total * (1 - run.build_progress));

  useEffect(() => {
    if (!live || run.build_progress >= 1) return;
    let elapsed = 0;
    const budget = total * (1 - run.build_progress);
    const id = window.setInterval(() => {
      if (document.hidden) return;
      elapsed += 0.1;
      const p = Math.min(1, run.build_progress + elapsed / total);
      setLeft(Math.max(0, budget - elapsed));
      if (elapsed % 0.5 < 0.11) checkpoint(p);
      if (p >= 1) {
        window.clearInterval(id);
        finish();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [live, total, run.build_progress, run.revision, checkpoint, finish]);

  const name = run.coder ? agentById(run.coder.id)?.name ?? run.coder.id : "Agent";
  return (
    <div data-testid="task-step-agent-build">
      <p className="terminal-prompt">
        $ agent run build — {name}
      </p>
      <p className="terminal-sage">Đang code… còn ~{left.toFixed(0)}s</p>
      {event ? <p className="terminal-sage mt-2">{event.log}</p> : null}
      <p className="terminal-sage mt-2">
        {run.bug_ids.length} bug tiềm năng sau lọc agent (IDs giữ nguyên khi retry).
      </p>
      <button type="button" className="terminal-cmd mt-3" data-testid="task-takeover-build" onClick={() => takeover()}>
        Tự làm nốt (manual)
      </button>
    </div>
  );
}

export function BugChoiceStep({ run }: { run: TaskRun }) {
  const choose = useGameStore((s) => s.chooseTaskFixer);
  const career = useGameStore((s) => s.career);
  const remaining = run.bug_ids.filter((id) => !run.fixed_bug_ids.includes(id));

  return (
    <div data-testid="task-step-bug-choice">
      <p className="terminal-prompt">$ ./chon-fixer</p>
      <p className="terminal-sage">
        Còn {remaining.length} <Term id="bug">bug</Term> (đã sửa {run.fixed_bug_ids.length}/{run.bug_ids.length}).
      </p>
      <button type="button" className="terminal-cmd mt-3" data-testid="task-fix-manual" onClick={() => choose("manual")}>
        [1] Tự bắt bug (manual test)
      </button>
      {AGENTS.agents.filter((a) => ownsAgent(career, a.id as AgentId)).map((agent, index) => (
        <button
          key={agent.id}
          type="button"
          className="terminal-cmd"
          data-testid={`task-fix-agent-${agent.id}`}
          onClick={() => choose(agent.id as AgentId)}
        >
          [{index + 2}] {agent.name} sửa giúp
        </button>
      ))}
    </div>
  );
}

export function AgentFixStep({ run, timeScale }: { run: TaskRun; timeScale: number }) {
  const checkpoint = useGameStore((s) => s.checkpointTaskAgentFix);
  const back = useGameStore((s) => s.switchTaskFixer);
  const live = useGameStore((s) => s.taskLive);
  const fixer = run.fixer_id ? agentById(run.fixer_id) : null;
  const m = fixer?.time_multiplier ?? 1;
  const total = agentFixTotalSec(timeScale, m);
  const workDoneRef = useRef(0);

  useEffect(() => {
    if (!live) return;
    let elapsed = 0;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      elapsed += 0.1;
      workDoneRef.current = elapsed / total;
      if (Math.round(elapsed * 10) % 5 === 0) checkpoint(elapsed / total);
      if (elapsed >= total) {
        window.clearInterval(id);
        checkpoint(1);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [live, total, run.revision, checkpoint]);

  return (
    <div data-testid="task-step-agent-fix">
      <p className="terminal-prompt">$ agent fix — {fixer?.name ?? run.fixer_id}</p>
      <p className="terminal-sage">Đang sửa bug… ~{total.toFixed(0)}s</p>
      <button type="button" className="terminal-cmd mt-3" onClick={() => back()}>
        Đổi cách sửa
      </button>
    </div>
  );
}

export function ReadyStep({
  pay,
  skillId,
  reputation,
  company,
  run,
}: {
  pay: number;
  skillId: string;
  reputation: number;
  company: boolean;
  run: TaskRun;
}) {
  const commit = useGameStore((s) => s.commitTaskRun);
  const close = useGameStore((s) => s.closeTask);

  return (
    <div data-testid="task-step-ready">
      <p className="terminal-prompt">$ ./san-sang-giao</p>
      <p>[ok] Đã xử lý xong phần làm — chưa nhận thưởng.</p>
      <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-1">
        <dt className="terminal-sage">tiền công</dt>
        <dd>{company ? "0đ (công ty)" : formatVnd(pay)}</dd>
        <dt className="terminal-sage">danh tiếng</dt>
        <dd>+{reputation}</dd>
        <dt className="terminal-sage">bug</dt>
        <dd>
          {run.bugs_caught}/{run.bugs_total} đã xử lý
        </dd>
      </dl>
      <button
        type="button"
        className="terminal-cmd mt-3"
        data-testid="task-commit-xong"
        onClick={() => commit()}
      >
        Xong — nhận thưởng
      </button>
      <button type="button" className="terminal-cmd mt-2" onClick={() => close()}>
        để sau [esc]
      </button>
      <p className="terminal-sage mt-2 text-xs">
        Skill: <Term id={skillId}>{skillId}</Term>
      </p>
    </div>
  );
}

export function manualTestLeftSec(run: TaskRun, timeScale: number): number {
  return run.manual_left_sec ?? manualBudgetSec(timeScale);
}
