"use client";

import { Modal } from "@/components/ui/modal";
import { useGameStore } from "@/game/state/store";
import { NOTICE_ACTION_DEFAULT_LABEL } from "@/game/career/types";
import { STORE_GRID } from "./store-grid.config";
import { NotificationsPanel } from "./NotificationsPanel";

/** Store grid, shown in the shared popup. Open state stays `storeOpen`. */
export function StoreModal() {
  const open = useGameStore((s) => s.notificationOpen);
  const setOpen = useGameStore((s) => s.setNotificationOpen);

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title={NOTICE_ACTION_DEFAULT_LABEL["openNotification"]}
      testId="store-modal"
      maxWidthPx={STORE_GRID.modalMaxPx}
    >
      <NotificationsPanel />
    </Modal>
  );
}
