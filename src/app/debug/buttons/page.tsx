"use client";

import { PixelButton } from "@/components/ui/button";
import { PixelIcon } from "@/components/game/PixelIcon";
import { PanelCard, PanelCardTitle } from "@/components/ui/panel-card";

export default function PixelButtonSpecimenPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8">
      <PanelCard className="flex flex-col gap-4 p-4">
        <PanelCardTitle>Nút pixel</PanelCardTitle>
        <p className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
          Giữ chuột để thấy mặt nút và chữ cùng tụt xuống.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <PixelButton variant="primary">Bắt đầu</PixelButton>
          <PixelButton variant="secondary">Để sau</PixelButton>
          <PixelButton variant="light">
            <PixelIcon name="learn_book" size={22} alt="" />
            Học
          </PixelButton>
          <PixelButton variant="danger">Bỏ</PixelButton>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PixelButton variant="primary" disabled>
            Bắt đầu
          </PixelButton>
          <PixelButton variant="secondary" disabled>
            Để sau
          </PixelButton>
          <PixelButton variant="danger" disabled>
            Bỏ
          </PixelButton>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PixelButton variant="icon" aria-label="Sức khỏe">
            <PixelIcon name="health" size={22} alt="" />
          </PixelButton>
          <PixelButton variant="icon" aria-label="Tinh thần">
            <PixelIcon name="mood" size={22} alt="" />
          </PixelButton>
          <PixelButton variant="icon" aria-label="Năng lượng">
            <PixelIcon name="energy" size={22} alt="" />
          </PixelButton>
        </div>
      </PanelCard>
    </main>
  );
}
