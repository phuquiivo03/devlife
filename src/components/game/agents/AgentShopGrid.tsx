"use client";

import { useState } from "react";
import { AGENTS, agentById, agentIconPath } from "@/game/agents/content";
import { agentBuyBlock, ownsAgent } from "@/game/agents/logic";
import type { AgentId } from "@/game/agents/types";
import { speedLabel } from "@/game/task-run/timing";
import { useGameStore } from "@/game/state/store";
import { formatVnd } from "@/lib/format-currency";
import { PixelButton } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import styles from "../store-grid.module.css";
import { cn } from "@/lib/utils";

export function AgentShopGrid({ ownedMode = false }: { ownedMode?: boolean }) {
  const career = useGameStore((s) => s.career);
  const buy = useGameStore((s) => s.buyAgentLicense);
  const taskJobId = useGameStore((s) => s.taskJobId);
  const [confirmId, setConfirmId] = useState<AgentId | null>(null);
  const list = ownedMode
    ? AGENTS.agents.filter((a) => ownsAgent(career, a.id as AgentId))
    : AGENTS.agents;

  if (list.length === 0) {
    return <p className={styles.empty}>{ownedMode ? "Chưa sở hữu license AI." : ""}</p>;
  }

  return (
    <ul className={styles.grid} data-store-grid="" data-testid={ownedMode ? "owned-agents-grid" : "agent-shop-grid"}>
      {list.map((agent) => {
        const id = agent.id as AgentId;
        const owned = ownsAgent(career, id);
        const reason = owned ? null : agentBuyBlock(career, id);
        const busy = taskJobId != null && owned;
        return (
          <li key={id} className={cn(styles.card, owned && styles.owned)} data-testid={`agent-card-${id}`}>
            <img
              src={agentIconPath(id, 256)}
              width={64}
              height={64}
              alt=""
              className={styles.art}
              style={{ objectFit: "contain", width: 64, height: 64 }}
            />
            <div className={styles.copy}>
              <p className={styles.name}>
                {agent.name} · Coding Agent
              </p>
              <p className="text-xs opacity-80">{agent.chip}</p>
              <p className={styles.price}>
                Thời gian code/fix {speedLabel(agent.time_multiplier)}
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs cursor-help">
                    Bug {Math.round(agent.bug_survival * 100)}% mỗi bug tiềm năng còn lại
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px]">
                  Xác suất mỗi bug tiềm năng (sau công thức task) vẫn còn sau khi agent code. Không phải
                  chance có bug trên mọi task.
                </TooltipContent>
              </Tooltip>
              <p className={styles.price}>{formatVnd(agent.price)} · Cân bằng thử nghiệm</p>
              <p className="text-xs text-[var(--accent-mint)]">
                {owned ? (busy ? "Đang giúp task" : "Sẵn sàng") : reason ?? "Chưa sở hữu"}
              </p>
            </div>
            {!ownedMode && !owned ? (
              <div className={styles.actions}>
                {confirmId === id ? (
                  <>
                    <p className="text-xs">
                      Mua {agent.name} với {formatVnd(agent.price)}? Số dư: {formatVnd(career.players.money)} →{" "}
                      {formatVnd(career.players.money - agent.price)}
                    </p>
                    <PixelButton variant="primary" data-testid={`agent-buy-confirm-${id}`} onClick={() => { buy(id); setConfirmId(null); }}>
                      Xác nhận mua
                    </PixelButton>
                    <PixelButton variant="secondary" onClick={() => setConfirmId(null)}>
                      Hủy
                    </PixelButton>
                  </>
                ) : (
                  <PixelButton
                    variant="primary"
                    disabled={reason != null}
                    data-testid={`agent-buy-${id}`}
                    onClick={() => setConfirmId(id)}
                  >
                    Mua
                  </PixelButton>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
