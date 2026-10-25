"use client";

import { useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { PixelButton } from "@/components/ui/button";
import { formatVnd } from "@/lib/format-currency";
import { playCueKey } from "@/game/audio/client";

export function HospitalPopup({
  open,
  hospitalCost,
  onDischarge,
}: {
  open: boolean;
  hospitalCost: number;
  onDischarge: () => void;
}) {
  useEffect(() => {
    if (open) {
      playCueKey("ambulance");
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onDischarge();
        }
      }}
      title="Nhập viện"
      testId="hospital-popup"
      closeLabel="Xuất viện"
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- scene art stays unoptimized */}
        <img
          src="/ui/scenes/scene_hospital.png"
          alt="Nhân vật kiệt sức nằm trên giường bệnh"
          width={256}
          height={256}
          className="size-auto max-w-none shrink-0"
          style={{ width: 256, height: 256, borderRadius: "var(--radius-tile)" }}
          draggable={false}
        />

        <div className="flex flex-col gap-2 text-center">
          <p className="font-galmuri-11 text-galmuri-title text-[var(--foreground)]">
            Bạn đã kiệt sức và phải nhập viện
          </p>

          <p className="font-galmuri-9 text-galmuri-body text-[var(--foreground-muted)]">
            Viện phí: <span className="text-[var(--status-money)]">{formatVnd(hospitalCost)}</span>
          </p>
        </div>

        <PixelButton
          type="button"
          variant="primary"
          onClick={onDischarge}
          data-testid="hospital-discharge-btn"
        >
          Xuất viện
        </PixelButton>
      </div>
    </Modal>
  );
}
