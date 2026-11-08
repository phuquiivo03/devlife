"use client";

import { useState } from "react";
import { AGENTS, agentById, agentIconPath } from "@/game/agents/content";
import { agentBuyBlock, ownsAgent } from "@/game/agents/logic";
import type { AgentId } from "@/game/agents/types";
import { useGameStore } from "@/game/state/store";
import { formatVnd } from "@/lib/format-currency";
import { PixelButton } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import agentStyles from "./AgentShopGrid.module.css";

function timeFactorLabel(m: number): string {
  return `×${m.toFixed(2)}`;
}

export function AgentShopGrid({ ownedMode = false }: { ownedMode?: boolean }) {
  const career = useGameStore((s) => s.career);
  const buy = useGameStore((s) => s.buyAgentLicense);
  const taskJobId = useGameStore((s) => s.taskJobId);
  const [confirmId, setConfirmId] = useState<AgentId | null>(null);
  const list = ownedMode
    ? AGENTS.agents.filter((a) => ownsAgent(career, a.id as AgentId))
    : AGENTS.agents;

  if (list.length === 0) {
    return <p className={agentStyles.empty}>{ownedMode ? "Chưa sở hữu license AI." : ""}</p>;
  }

  return (
    <div className={agentStyles.wrap}>
      {!ownedMode ? (
        <p className={agentStyles.disclaimer}>
          Giá và chỉ số agent đang thử nghiệm — có thể chỉnh sau khi cân bằng.
        </p>
      ) : null}
      <ul className={agentStyles.grid} data-agent-shop-grid="" data-testid={ownedMode ? "owned-agents-grid" : "agent-shop-grid"}>
        {list.map((agent) => {
          const id = agent.id as AgentId;
          const owned = ownsAgent(career, id);
          const reason = owned ? null : agentBuyBlock(career, id);
          const busy = taskJobId != null && owned;
          const bugPct = Math.round(agent.bug_survival * 100);

          return (
            <li key={id} className={cn(agentStyles.card, owned && agentStyles.owned)} data-testid={`agent-card-${id}`}>
              <div className={agentStyles.header}>
                <img src={agentIconPath(id, 64)} width={52} height={52} alt="" className={agentStyles.art} />
                <div className={agentStyles.titleBlock}>
                  <p className={agentStyles.name}>{agent.name}</p>
                  <p className={agentStyles.chip}>{agent.chip}</p>
                </div>
              </div>

              <dl className={agentStyles.stats}>
                <dt>Giá</dt>
                <dd>{formatVnd(agent.price)}</dd>
                <dt>Thời gian</dt>
                <dd title={`Hệ số thời gian code/fix so với manual (1 = như tự làm).`}>
                  {timeFactorLabel(agent.time_multiplier)}
                </dd>
                <dt>Bug</dt>
                <dd>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={agentStyles.bugHelp}>q {bugPct}%</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[240px]">
                      Với mỗi bug tiềm năng B (sau công thức task), xác suất bug đó vẫn còn sau khi
                      agent code là q ({bugPct}%). Độc lập từng bug — không phải “% task có bug”.
                    </TooltipContent>
                  </Tooltip>
                </dd>
              </dl>

              <p
                className={cn(agentStyles.status, reason != null && !owned && agentStyles.statusBlock)}
              >
                {owned
                  ? busy
                    ? "Đang giúp task"
                    : "Đã sở hữu · sẵn sàng"
                  : reason ?? "Chưa sở hữu"}
              </p>

              {!ownedMode && !owned ? (
                <div className={agentStyles.actions}>
                  {confirmId === id ? (
                    <>
                      <p className={agentStyles.confirmCopy}>
                        Mua {agent.name}? Số dư {formatVnd(career.players.money)} →{" "}
                        {formatVnd(career.players.money - agent.price)}
                      </p>
                      <PixelButton
                        variant="primary"
                        data-testid={`agent-buy-confirm-${id}`}
                        onClick={() => {
                          buy(id);
                          setConfirmId(null);
                        }}
                      >
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
    </div>
  );
}
