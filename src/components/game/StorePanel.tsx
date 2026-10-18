"use client";

/* eslint-disable @next/next/no-img-element -- native pixel art stays unoptimized */

import { PixelButton } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CareerState } from "@/game/career/types";
import { m5AssetPath, type M5AssetKey } from "@/game/life/assets";
import { buyBlock, shopOf, STORE, STORE_ITEMS, storePrice, unlockBlock, type StoreItem } from "@/game/life/furniture";
import { useGameStore } from "@/game/state/store";
import { snapshot } from "@/game/time";
import { formatVnd } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { PixelIcon } from "./PixelIcon";
import { STORE_GRID, storeGridCss, storeIconSize } from "./store-grid.config";
import { filterStoreItems, STORE_TABS, storeCardAction, type StoreTabId } from "./store-shelf";
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
  const locked = !owned && unlockBlock(career, item) != null;
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
  const career = useGameStore((s) => s.career);
  const day = useGameStore((s) => snapshot(s.totalMinutes).day);
  const buy = useGameStore((s) => s.buyStoreItem);
  const pin = useGameStore((s) => s.pinStoreItem);
  const sale = STORE.black_friday_discount;

  return (
    <div data-testid="store-panel" data-sale={sale}>
      <style>{storeGridCss()}</style>
      <Tabs defaultValue={STORE_TABS[0].id} className={styles.panel}>
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
        {item.action.pin ? (
          <PixelButton
            variant="secondary"
            aria-pressed={item.pinned}
            data-testid={`store-pin-${item.id}`}
            data-pinned={item.pinned ? "1" : "0"}
            onClick={() => onPin(item.pinned ? null : item.id)}
          >
            {item.pinned ? "Đang ghim" : "Ghim"}
          </PixelButton>
        ) : null}
      </div>
    </li>
  );
}
