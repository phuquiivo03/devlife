import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import {
  BUTTON_ASSET_KEYS,
  pixelButtonStyle,
  type ButtonVariant,
} from "./config";
import styles from "./pixel-button.module.css";

export type PixelButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  asChild?: boolean;
};

/**
 * Shared pixel-3D button. Skins are the `ui_btn_*` 9-slices.
 * Press swaps to the pressed sheet and drops the label with the face.
 */
export function PixelButton({
  variant = "primary",
  className,
  asChild = false,
  type,
  style,
  disabled,
  children,
  ...props
}: PixelButtonProps) {
  const classNames = cn(
    styles.pixelButton,
    variant === "light" ? styles.light : "font-galmuri-11 text-galmuri-small",
    variant === "icon" && styles.icon,
    className,
  );
  const shared = {
    className: classNames,
    style: { ...pixelButtonStyle(variant), ...style },
    "data-variant": variant,
    "data-asset-key": BUTTON_ASSET_KEYS[variant],
  };

  if (asChild) {
    return (
      <Slot {...shared} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button type={type ?? "button"} disabled={disabled} {...shared} {...props}>
      <span className={styles.label} data-pixel-label="">
        {children}
      </span>
    </button>
  );
}
