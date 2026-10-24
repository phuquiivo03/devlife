import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-[var(--radius-ctrl)] border-0 bg-[var(--tab-lavender)] px-4 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground transition-bouncy focus-visible:bg-input focus-visible:outline-none focus-visible:shadow-[var(--clay-recessed),0_0_0_3px_var(--accent-violet)] disabled:cursor-not-allowed disabled:opacity-50 md:h-11",
        className,
      )}
      {...props}
    />
  );
}
