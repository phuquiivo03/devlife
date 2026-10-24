import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PanelCard({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-panel bg-panel shadow-panel", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PanelCardTitle({
  className,
  children,
  icon,
}: {
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-2 font-galmuri-11 text-galmuri-title", className)}>
      {icon}
      <h2 className="font-normal text-foreground">{children}</h2>
    </div>
  );
}
