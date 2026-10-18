"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1 rounded-[var(--radius-panel)] border border-[var(--panel-border)] bg-[var(--tab-lavender)] text-[var(--muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex min-h-8 flex-1 items-center justify-center whitespace-nowrap rounded-sm  py-1.5 font-galmuri-11 text-galmuri-title transition-colors data-[state=active]:bg-[var(--tab-lavender-active)] data-[state=active]:text-[var(--foreground)] data-[state=active]:border-black data-[state=active]:border-[4px] box-border",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("focus-visible:outline-none", className)}
      {...props}
    />
  );
}
