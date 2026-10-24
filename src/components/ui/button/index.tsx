import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-galmuri-11 text-galmuri-title transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-10 md:min-h-9",
  {
    variants: {
      variant: {
        default: "btn-soft bg-[var(--accent-violet)] text-white hover:bg-[#4a54b8]",
        secondary: "btn-soft bg-[var(--panel-bg)] text-[var(--foreground)]",
        outline: "btn-soft bg-transparent text-[var(--foreground)]",
        ghost:
          "rounded-[var(--radius-ctrl)] border border-transparent text-[var(--foreground)] hover:bg-white/40",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-galmuri-body",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  showArrow?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  showArrow: _unusedShowArrow,
  children,
  ...props
}: ButtonProps) {
  void _unusedShowArrow;
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props}>
      {children}
    </Comp>
  );
}

export { buttonVariants };
export { PixelButton, type PixelButtonProps } from "./pixel-button";
export {
  BUTTON_ASSET_FILES,
  BUTTON_ASSET_KEYS,
  BUTTON_PRESS_FACE_SHIFT_PX,
  BUTTON_UI_SCALE,
  buttonAssetPath,
  buttonMetrics,
  pixelButtonStyle,
} from "./config";
