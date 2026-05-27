import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="stepper flex w-full items-start gap-0">
        {steps.map((label, i) => {
          const done = i < current;
          const cur = i === current;
          return (
            <li
              key={label}
              className={cn(
                "step-item relative flex flex-1 flex-col items-center gap-2",
                done && "completed",
                cur && "current"
              )}
              aria-current={cur ? "step" : undefined}
            >
              <span
                className={cn(
                  "step-circle flex size-8 items-center justify-center rounded-full text-[13px] font-semibold transition-all",
                  !done && !cur && "step-circle todo border border-border bg-muted text-muted-foreground",
                  cur &&
                    "border-0 bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-400)] text-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand-500)_22%,transparent),0_4px_12px_color-mix(in_srgb,var(--brand-500)_38%,transparent)]",
                  done &&
                    "border-0 bg-gradient-to-br from-[var(--accent-500)] to-[var(--accent-400)] text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--accent-500)_35%,transparent)]"
                )}
                aria-label={`Step ${i + 1}: ${label}${done ? " completed" : cur ? " current" : ""}`}
              >
                {done ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <span
                className={cn(
                  "step-label max-w-[7rem] text-center text-[11px] font-medium text-muted-foreground",
                  cur && "font-semibold text-[var(--brand-300)]",
                  done && "text-[var(--accent-400)]"
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
