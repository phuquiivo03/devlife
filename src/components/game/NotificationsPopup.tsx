"use client";

import { Modal } from "@/components/ui/modal";
import { useGameStore } from "@/game/state/store";
import { NotificationsPanel } from "./NotificationsPanel";

/** Notifications panel popup, opened by the bell icon button in the status bar. */
export function NotificationsPopup() {
  const open = useGameStore((s) => s.notificationOpen);
  const setOpen = useGameStore((s) => s.setNotificationOpen);

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Thông báo"
      testId="notifications-modal"
      maxWidthPx={500}
    >
      <NotificationsPanel />
    </Modal>
  );
}
