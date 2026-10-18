"use client";

/* eslint-disable @next/next/no-img-element -- native pixel art stays unoptimized */

import { PixelButton } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LIFE } from "@/game/life/content";
import { m51AssetPath } from "@/game/life/assets";
import { actionEatArtFile, foodArtFile, foodDockMetrics } from "@/game/life/m51-art";
import { hungerLevel } from "@/game/life/hunger";
import { lifeOf, mealBlocked } from "@/game/life/logic";
import { foodPrice } from "@/game/life/traits";
import { useGameStore } from "@/game/state/store";
import { cn } from "@/lib/utils";
import { formatVnd } from "@/lib/format-currency";
import { foodButtonMetrics, foodHungerTip, hungerBowlBlinkStyle } from "./food-dock.config";
import styles from "./food-dock.module.css";

/** Icon-only Ăn control. Sits on the HUD icon bar beside Đi ngủ and opens Ăn uống. */
export function HungerDock() {
  const slots = useGameStore((s) => lifeOf(s.career).slotsSinceMeal);
  const open = useGameStore((s) => s.foodOpen);
  const setOpen = useGameStore((s) => s.setFoodOpen);
  const hunger = hungerLevel(slots);
  const metrics = foodButtonMetrics();
  const tip = foodHungerTip(hunger);
  const blinking = hunger !== "full";

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex" data-testid="hunger" data-hunger={hunger} data-slots={slots}>
            <PixelButton
              variant="icon"
              aria-label={tip}
              className={styles.button}
              style={{
                width: metrics.buttonPx,
                height: metrics.buttonPx,
                minWidth: metrics.buttonPx,
                minHeight: metrics.buttonPx,
              }}
              onClick={() => setOpen(true)}
              data-testid="food-open"
            >
              <img
                src={m51AssetPath(foodArtFile())}
                alt=""
                width={metrics.iconPx}
                height={metrics.iconPx}
                draggable={false}
                data-testid="food-bowl-icon"
                data-hunger-blink={hunger}
                data-icon-key="icon_btn_food"
                className={cn("pixel-img", styles.icon, blinking && styles.bowlBlink)}
                style={{
                  width: metrics.iconPx,
                  height: metrics.iconPx,
                  ...hungerBowlBlinkStyle(hunger),
                }}
              />
            </PixelButton>
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

export function FoodPopup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const career = useGameStore((s) => s.career);
  const eat = useGameStore((s) => s.eat);
  const dock = foodDockMetrics();

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Ăn uống" testId="food-popup" closeLabel="Đóng">
      <img
        src={m51AssetPath(actionEatArtFile())}
        width={dock.actionPx}
        height={dock.actionPx}
        alt=""
        className="pixel-img"
        data-testid="food-eat-icon"
      />
      <div className="mt-3 flex flex-col gap-2">
        {LIFE.foods.map((food) => {
          const reason = mealBlocked(career, food.id);
          const price = foodPrice(food.price, career);
          return (
            <PixelButton
              key={food.id}
              variant="secondary"
              disabled={reason != null}
              aria-disabled={reason != null}
              title={reason ?? food.label}
              className="w-full"
              data-testid={`food-${food.id}`}
              onClick={() => eat(food.id)}
            >
              {food.label} · {formatVnd(price)}
              {food.health < 0 ? " · sức khỏe giảm" : ""}
            </PixelButton>
          );
        })}
      </div>
    </Modal>
  );
}
