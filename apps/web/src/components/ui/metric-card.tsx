"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  format = "currency",
  trend,
  icon: Icon,
  loading,
  className,
}: {
  label: string;
  value: number;
  format?: "currency" | "number";
  trend?: { value: number; positive: boolean };
  icon: LucideIcon;
  loading?: boolean;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (loading) return;
    const duration = 800;
    const start = performance.now();
    const from = 0;
    const to = value;
    let frame: number;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, loading]);

  const formatted =
    format === "currency" ? formatCurrency(display) : display.toLocaleString("en-IN");

  if (loading) {
    return (
      <div
        className={cn(
          "glass-2 relative overflow-hidden rounded-xl p-6 shadow-[var(--shadow-md)]",
          className
        )}
      >
        <Skeleton className="mb-4 h-4 w-24 skeleton-vetan" />
        <Skeleton className="h-9 w-40 skeleton-vetan" />
        <Skeleton className="mt-2 h-3 w-32 skeleton-vetan" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "glass-2 relative overflow-hidden rounded-xl p-6 shadow-[var(--shadow-md)] transition-transform duration-[var(--dur-default)] [animation:slideUpFade_0.45s_var(--ease-spring)_both]",
        className
      )}
    >
      <div
        className="pointer-events-none absolute left-5 right-5 top-0 h-0.5 rounded-b-sm bg-gradient-to-r from-[var(--brand-500)] to-[var(--accent-500)]"
        aria-hidden
      />
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand-500)_14%,transparent)] text-[var(--brand-400)]">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground [animation:countUp_0.5s_var(--ease-decelerate)_both]">
        {formatted}
      </p>
      {trend ? (
        <p
          className={cn(
            "mt-2 text-xs font-medium tabular-nums",
            trend.positive ? "text-[var(--success-text)]" : "text-[var(--danger-text)]"
          )}
        >
          {trend.positive ? "▲" : "▼"} {Math.abs(trend.value).toFixed(1)}% vs last month
        </p>
      ) : null}
    </div>
  );
}
