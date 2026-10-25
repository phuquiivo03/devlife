"use client";

import { useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { PixelButton } from "@/components/ui/button";
import { formatVnd } from "@/lib/format-currency";
import { playCueKey } from "@/game/audio/client";

/**
 * Fired summary. Same full-screen layout as the hospital popup: title,
 * illustration, one summary line, the final payout, and a single Đóng that
 * also transfers that payout (see `closeFiredPopup`).
 */
export function FiredPopup({
  open,
  company,
  days,
  lateTasks,
  payout,
  onClose,
}: {
  open: boolean;
  company: string;
  days: number;
  lateTasks: number;
  payout: number;
  onClose: () => void;
}) {
  useEffect(() => {
    if (open) {
      playCueKey("jobFailed");
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
      title="Bạn đã bị công ty sa thải"
      testId="fired-popup"
      closeLabel="Đóng"
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {/* Art gen sau — tạm dùng icon deadline làm minh hoạ. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel icon stays unoptimized */}
        <img
          src="/ui/icons/icon_deadline.png"
          alt=""
          width={128}
          height={128}
          draggable={false}
          className="size-auto max-w-none shrink-0"
          style={{ width: 128, height: 128, borderRadius: "var(--radius-tile)" }}
        />

        <div className="flex flex-col gap-2 text-center">
          <p className="font-galmuri-11 text-galmuri-title text-[var(--foreground)]">
            {company} chấm dứt hợp đồng
          </p>
          <p className="font-galmuri-9 text-galmuri-body text-[var(--foreground-muted)]">
            Làm được {days} ngày, trễ {lateTasks} task
          </p>
          <p className="font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
            Lương được nhận:{" "}
            <span className="text-[var(--status-money)]">{formatVnd(payout)}</span>
          </p>
        </div>

        <PixelButton type="button" variant="primary" onClick={onClose} data-testid="fired-close-btn">
          Đóng
        </PixelButton>
      </div>
    </Modal>
  );
}
