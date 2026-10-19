import { cn } from "@/lib/utils";

const barTone: Record<string, string> = {
  coral: "bg-[var(--accent-coral)]",
  mint: "bg-[var(--accent-mint)]",
  sky: "bg-[var(--accent-sky)]",
  exp: "bg-[var(--accent-mint)]",
};

type Props = {
  value: number;
  max?: number;
  tone: keyof typeof barTone;
  className?: string;
  stepped?: boolean;
};

export function StatBar({ value, max = 100, tone, className, stepped = false, instant = false }: Props & { instant?: boolean }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-sm border border-[var(--panel-border)] bg-white/60",
        className,
      )}
    >
      <div
        className={cn("h-full", stepped ? "xp-fill" : instant ? "" : "transition-[width] duration-300", barTone[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
