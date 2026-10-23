"use client";

import { Modal } from "@/components/ui/modal";
import { useGameStore } from "@/game/state/store";
import { AudioControls } from "./AudioControls";

/** Audio controls popup, opened by the bell/sound icon button in the status bar. */
export function AudioPopup({ iconFiles = [] }: { iconFiles?: readonly string[] }) {
  const open = useGameStore((s) => s.audioPopupOpen);
  const setOpen = useGameStore((s) => s.setAudioPopupOpen);

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Cài đặt âm thanh"
      testId="audio-modal"
      maxWidthPx={400}
    >
      <AudioControls iconFiles={iconFiles} />
    </Modal>
  );
}
