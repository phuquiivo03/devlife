"use client";

/* eslint-disable @next/next/no-img-element -- native pixel art stays unoptimized */

import { useState } from "react";
import { PixelButton } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CareerState } from "@/game/career/types";
import type { StageId } from "@/game/config";
import { m5AssetPath, type M5AssetKey } from "@/game/life/assets";
import { buyBlock, shopOf, STORE, STORE_ITEMS, storePrice, type StoreItem } from "@/game/life/furniture";
import { useGameStore } from "@/game/state/store";
import { snapshot } from "@/game/time";
import { formatVnd } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { PixelIcon } from "./PixelIcon";
import { STORE_GRID, storeGridCss, storeIconSize } from "./store-grid.config";
import { filterStoreItems, STORE_MODE_TABS, STORE_TABS, storeCardAction, type StoreModeId, type StoreTabId } from "./store-shelf";
import { getOwnedItems, findAcceptingSlots, type OwnedItemModel } from "./owned-items";
import styles from "./store-grid.module.css";

type CardModel = {
  id: string;
  label: string;
  icon: string;
  price: number;
  priceLabel: string;
  owned: boolean;
  locked: boolean;
  pinned: boolean;
  reason: string | null;
  action: ReturnType<typeof storeCardAction>;
};

function cardModel(item: StoreItem, career: CareerState, day: number): CardModel {
  const shop = shopOf(career);
  const owned = shop.owned.includes(item.id);
  const locked = !owned && true; // No more unlock blocks based on room
  const block = owned ? null : buyBlock(career, item.id);
  const price = storePrice(item, day);
  return {
    id: item.id,
    label: item.label,
    icon: item.icon,
    price,
    priceLabel: formatVnd(price),
    owned,
    locked,
    pinned: shop.pin === item.id,
    reason: block,
    action: storeCardAction({ owned, locked, canBuy: block == null }),
  };
}

export function StorePanel() {
  const [mode, setMode] = useState<StoreModeId>("store");
  const career = useGameStore((s) => s.career);
  const stage = useGameStore((s) => s.stage);
  const loadout = useGameStore((s) => s.loadouts[stage]);
  const day = useGameStore((s) => snapshot(s.totalMinutes).day);
  const buy = useGameStore((s) => s.buyStoreItem);
  const pin = useGameStore((s) => s.pinStoreItem);
  const setSlotItem = useGameStore((s) => s.setSlotItem);
  const sale = STORE.black_friday_discount;

  const ownedItems = mode === "owned" ? getOwnedItems(career, stage, loadout) : [];

  return (
    <div data-testid="store-panel" data-sale={sale}>
      <style>{storeGridCss()}</style>

      {/* Top-level mode tabs: Cửa hàng / Đã sở hữu */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as StoreModeId)} className={styles.panel}>
        <TabsList
          aria-label="Chế độ cửa hàng"
          className={cn(styles.tabs, "grid h-11 w-full")}
          style={{ gridTemplateColumns: `repeat(${STORE_MODE_TABS.length}, minmax(0, 1fr))` }}
        >
          {STORE_MODE_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className={styles.tab} data-testid={`store-mode-${tab.id}`}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Store mode: show sub-tabs for categories */}
        <TabsContent value="store">
          <Tabs defaultValue={STORE_TABS[0].id} className={styles.subPanel}>
            <TabsList
              aria-label="Danh mục cửa hàng"
              className={cn(styles.tabs, "grid h-11 w-full")}
              style={{ gridTemplateColumns: `repeat(${STORE_TABS.length}, minmax(0, 1fr))` }}
            >
              {STORE_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className={styles.tab} data-testid={`store-tab-${tab.id}`}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {STORE_TABS.map((tab) => (
              <TabsContent key={tab.id} value={tab.id}>
                <StoreGrid
                  tab={tab.id}
                  items={filterStoreItems(STORE_ITEMS, tab.id).map((item) => cardModel(item, career, day))}
                  onBuy={buy}
                  onPin={pin}
                />
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* Owned mode: show owned items */}
        <TabsContent value="owned">
          <OwnedGrid items={ownedItems} stage={stage} onActivate={setSlotItem} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StoreGrid({
  tab,
  items,
  onBuy,
  onPin,
}: {
  tab: StoreTabId;
  items: readonly CardModel[];
  onBuy: (id: string) => void;
  onPin: (id: string | null) => void;
}) {
  if (items.length === 0) {
    return <p className={styles.empty}>Không có món.</p>;
  }
  return (
    <ul className={styles.grid} data-store-grid="" data-testid={`store-grid-${tab}`}>
      {items.map((item) => (
        <StoreCard key={item.id} item={item} onBuy={onBuy} onPin={onPin} />
      ))}
    </ul>
  );
}

function StoreCard({
  item,
  onBuy,
  onPin,
}: {
  item: CardModel;
  onBuy: (id: string) => void;
  onPin: (id: string | null) => void;
}) {
  const icon = storeIconSize(item.icon);
  return (
    <li
      className={cn(styles.card, item.owned && styles.owned, item.locked && styles.locked)}
      data-testid={`store-item-${item.id}`}
      data-owned={item.owned ? "1" : "0"}
      data-locked={item.locked ? "1" : "0"}
      data-price={item.price}
    >
      {item.owned ? (
        <span className={styles.badge}>
          <PixelIcon name="task_done" size={STORE_GRID.badgePx} alt="" />
        </span>
      ) : null}
      {item.locked ? (
        <span className={styles.badge}>
          <PixelIcon name="task_locked" size={STORE_GRID.badgePx} alt="" />
        </span>
      ) : null}
      <div className={styles.artWrap} style={{ height: STORE_GRID.furnitureIconPx }}>
        <img
          src={m5AssetPath(item.icon as M5AssetKey)}
          width={icon.w}
          height={icon.h}
          alt=""
          draggable={false}
          className={`${styles.art} pixel-img`}
          style={{ width: icon.w, height: icon.h }}
        />
      </div>
      <div className={styles.copy}>
        <p className={styles.name}>{item.label}</p>
        <p className={styles.price}>{item.priceLabel}</p>
        {item.reason ? <p className={styles.reason}>{item.reason}</p> : null}
      </div>
      <div className={styles.actions}>
        {item.action.buy === "owned" ? (
          <PixelButton variant="secondary" disabled className={styles.ownedButton} data-testid={`store-buy-${item.id}`}>
            Đã có
          </PixelButton>
        ) : null}
        {item.action.buy === "buy" ? (
          <PixelButton
            variant="primary"
            disabled={item.reason != null}
            title={item.reason ?? undefined}
            data-testid={`store-buy-${item.id}`}
            onClick={() => onBuy(item.id)}
          >
            Mua
          </PixelButton>
        ) : null}
        {/* {item.action.pin ? (
          <PixelButton
            variant="secondary"
            aria-pressed={item.pinned}
            data-testid={`store-pin-${item.id}`}
            data-pinned={item.pinned ? "1" : "0"}
            onClick={() => onPin(item.pinned ? null : item.id)}
          >
            {item.pinned ? "Đang ghim" : "Ghim"}
          </PixelButton>
        ) : null} */}
      </div>
    </li>
  );
}

function OwnedGrid({
  items,
  stage,
  onActivate,
}: {
  items: readonly OwnedItemModel[];
  stage: string;
  onActivate: (slotId: string, itemId: string | null) => void;
}) {
  if (items.length === 0) {
    return <p className={styles.empty}>Chưa có đồ nào.</p>;
  }

  return (
    <ul className={styles.grid} data-store-grid="" data-testid="owned-grid">
      {items.map((item) => (
        <OwnedCard key={item.catalogId || item.storeId} item={item} stage={stage} onActivate={onActivate} />
      ))}
    </ul>
  );
}

function OwnedCard({
  item,
  stage,
  onActivate,
}: {
  item: OwnedItemModel;
  stage: string;
  onActivate: (slotId: string, itemId: string | null) => void;
}) {
  // Determine image path based on item type
  const isStoreItem = !!item.storeId; // Store items use m5 icons, catalog items use sprite paths
  const imagePath = isStoreItem ? m5AssetPath(item.icon as M5AssetKey) : `/assets/${item.icon}.png`;
  const imagePath2x = isStoreItem ? undefined : `/assets/${item.icon}_x2.png`;

  const icon = storeIconSize(item.icon);
  const isActive = item.status === "active";
  const isOverlay = item.isOverlay;
  const noSlotInRoom = item.noSlotInRoom;
  const canActivate = item.catalogId !== "" && !isOverlay && !noSlotInRoom; // Replacement items with accepting slots
  const acceptingSlots = canActivate ? findAcceptingSlots(item.catalogId, stage as StageId) : [];
  const hasRequiredSlot = acceptingSlots.some((s) => s.required);

  const handleClick = () => {
    // Overlay items: toggle visibility (to be implemented with save migration)
    if (isOverlay) {
      // TODO: implement toggle for overlay items
      return;
    }

    if (!canActivate) return;

    // If already active, try to remove (only if slot is not required)
    if (isActive && item.activeSlot) {
      const slot = acceptingSlots.find((s) => s.id === item.activeSlot);
      if (slot?.required) {
        return; // Block removal of required slot
      }
      onActivate(item.activeSlot, null);
      return;
    }

    // Activate: find first accepting slot and place item there
    const targetSlot = acceptingSlots[0];
    if (targetSlot) {
      onActivate(targetSlot.id, item.catalogId);
    }
  };

  const statusLabel = isActive
    ? "Đang dùng"
    : "Chưa dùng";

  const tooltipText = noSlotInRoom
    ? "Phòng này không có chỗ đặt món này"
    : isOverlay
      ? "Đồ chồng lên phòng (bấm để ẩn/hiện - đang phát triển)"
      : isActive && hasRequiredSlot
        ? "Không thể gỡ đồ bắt buộc"
        : !canActivate
          ? "Đồ này không thể đặt vào phòng"
          : `Bấm để ${isActive ? "gỡ ra" : "đặt vào phòng"}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <li
          className={cn(
            styles.card,
            isActive && styles.owned,
            noSlotInRoom && styles.locked,
          )}
          data-testid={`owned-item-${item.catalogId || item.storeId}`}
          data-status={item.status}
          onClick={handleClick}
          style={{ cursor: noSlotInRoom || (!canActivate && !isOverlay) ? "not-allowed" : "pointer", opacity: noSlotInRoom ? 0.5 : 1 }}
        >
          {isActive ? (
            <span className={styles.badge}>
              <PixelIcon name="task_done" size={STORE_GRID.badgePx} alt="" />
            </span>
          ) : null}
          <div className={styles.artWrap} style={{ height: STORE_GRID.furnitureIconPx }}>
            <img
              src={imagePath}
              srcSet={imagePath2x ? `${imagePath2x} 2x` : undefined}
              width={icon.w}
              height={icon.h}
              alt=""
              draggable={false}
              className={`${styles.art} pixel-img`}
              style={{ width: icon.w, height: icon.h }}
            />
          </div>
          <div className={styles.copy}>
            <p className={styles.name}>{item.label}</p>
            <p className={cn(styles.price, isActive && "text-[var(--accent-mint)]")}>
              {statusLabel}
            </p>
          </div>
        </li>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
