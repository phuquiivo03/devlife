"use client";

/* eslint-disable @next/next/no-img-element -- native pixel art stays unoptimized */

import { PixelButton } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LIFE, type FoodId } from "@/game/life/content";
import { m51AssetPath } from "@/game/life/assets";
import { actionEatArtFile, foodArtFile, foodDockMetrics } from "@/game/life/m51-art";
import { lifeOf, mealBlocked } from "@/game/life/logic";
import { foodPrice } from "@/game/life/traits";
import { useGameStore } from "@/game/state/store";
import { cn } from "@/lib/utils";
import { formatVnd } from "@/lib/format-currency";
import {
  foodButtonMetrics,
  foodDockTip,
  foodDotVisible,
  foodEatBlockReason,
} from "./food-dock.config";
import { foodGridCss, FOOD_GRID } from "./food-grid.config";
import styles from "./food-dock.module.css";
import foodGridStyles from "./food-grid.module.css";

/** Icon-only Ăn control. Sits on the HUD icon bar beside Đi ngủ and opens Ăn uống. */
export function HungerDock({ clay = false }: { clay?: boolean }) {
  const fullness = useGameStore((s) => s.career.players.fullness);
  const open = useGameStore((s) => s.foodOpen);
  const setOpen = useGameStore((s) => s.setFoodOpen);
  const blocked = foodEatBlockReason(fullness);
  const metrics = foodButtonMetrics();
  const tip = foodDockTip(blocked);
  const ready = foodDotVisible(fullness);
  const iconPx = clay ? 24 : metrics.iconPx;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="relative inline-flex w-full"
            data-testid="hunger"
            data-fullness={Math.round(fullness)}
            data-blocked={blocked ? "1" : "0"}
          >
            <PixelButton
              variant="icon"
              disabled={blocked != null}
              aria-label={tip}
              className={clay ? "clay-tile-inner w-full" : styles.button}
              style={
                clay
                  ? { width: "100%", height: 40, minHeight: 40 }
                  : {
                      width: metrics.buttonPx,
                      height: metrics.buttonPx,
                      minWidth: metrics.buttonPx,
                      minHeight: metrics.buttonPx,
                    }
              }
              onClick={() => setOpen(true)}
              data-testid="food-open"
            >
              <img
                src={m51AssetPath(foodArtFile())}
                alt=""
                width={iconPx}
                height={iconPx}
                draggable={false}
                data-testid="food-bowl-icon"
                data-icon-key="icon_btn_food"
                className={cn("pixel-img", styles.icon)}
                style={{
                  width: iconPx,
                  height: iconPx,
                }}
              />
            </PixelButton>
            {ready && <span className={styles.readyDot} data-testid="food-ready-dot" />}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" data-testid="food-tooltip">
          {tip}
        </TooltipContent>
      </Tooltip>
      <FoodPopup open={open} onOpenChange={setOpen} />
    </>
  );
}

const FOOD_ICON_MAP: Record<string, string> = {
  noodles: 'mi_x2',
  banh_mi: 'banh_mi_x2',
  home_rice: 'nau_com_x2',
  com_tam: 'com_x2',
  bun_bo: 'bun_bo_x2',
  ga_chien: 'ga_chien_x2',
};

function FoodCard({
  food,
  price,
  reason,
  onEat,
}: {
  food: { id: FoodId; label: string; health: number };
  price: number;
  reason: string | null;
  onEat: (id: FoodId) => void;
}) {

  const iconFile = FOOD_ICON_MAP[food.id];
  const iconPath = `/ui/icons/food/${iconFile}.png`;
  const disabled = reason != null;

  return (
    <li
      className={cn(foodGridStyles.card, disabled && foodGridStyles.disabled)}
      data-testid={`food-card-${food.id}`}
    >
      <div className={foodGridStyles.artWrap}>
        <img
          src={iconPath}
          alt=""
          width={FOOD_GRID.foodIconPx}
          height={FOOD_GRID.foodIconPx}
          className="pixel-img"
          draggable={false}
        />
      </div>
      <div className={foodGridStyles.copy}>
        <p className={foodGridStyles.name}>{food.label}</p>
        <p className={foodGridStyles.price}>{formatVnd(price)}</p>
        {food.health !== 0 && (
          <p className={cn(foodGridStyles.health, food.health > 0 ? foodGridStyles.positive : foodGridStyles.negative)}>
            {food.health > 0 ? 'sức khỏe +' : 'sức khỏe giảm'}
          </p>
        )}
      </div>
      <PixelButton
        variant="secondary"
        disabled={disabled}
        aria-disabled={disabled}
        title={reason ?? undefined}
        className={foodGridStyles.actionBtn}
        data-testid={`food-eat-${food.id}`}
        onClick={() => onEat(food.id)}
      >
        Ăn
      </PixelButton>
    </li>
  );
}

export function FoodPopup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const career = useGameStore((s) => s.career);
  const eat = useGameStore((s) => s.eat);
  const dock = foodDockMetrics();

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Ăn uống" testId="food-popup" closeLabel="Đóng" maxWidthPx={FOOD_GRID.modalMaxPx}>
      <style>{foodGridCss()}</style>
      <img
        src={m51AssetPath(actionEatArtFile())}
        width={dock.actionPx}
        height={dock.actionPx}
        alt=""
        className="pixel-img"
        data-testid="food-eat-icon"
      />
      <ul className={foodGridStyles.grid} data-food-grid="" data-testid="food-grid">
        {LIFE.foods.map((food) => {
          const reason = mealBlocked(career, food.id);
          const price = foodPrice(food.price, career);
          return (
            <FoodCard
              key={food.id}
              food={food}
              price={price}
              reason={reason}
              onEat={eat}
            />
          );
        })}
      </ul>
    </Modal>
  );
}
