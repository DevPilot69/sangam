import type { LucideIcon } from "lucide-react";
import { Users, Calculator, Palmtree, FileBarChart } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const presets: Record<
  "employees" | "payroll" | "leave" | "reports",
  { icon: LucideIcon; title: string; description: string }
> = {
  employees: {
    icon: Users,
    title: "Your team starts here",
    description: "Add employees to run payroll, track leave, and deliver payslips.",
  },
  payroll: {
    icon: Calculator,
    title: "No payroll runs yet",
    description: "Start your first payroll run when employees and salaries are ready.",
  },
  leave: {
    icon: Palmtree,
    title: "No leave requests",
    description: "Leave approvals and balances will show up here.",
  },
  reports: {
    icon: FileBarChart,
    title: "No reports generated",
    description: "Pick a report type and export payroll, statutory, or attendance data.",
  },
};

export function EmptyState({
  variant,
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  variant?: keyof typeof presets;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}) {
  const p = variant ? presets[variant] : null;
  const FinalIcon = Icon ?? p?.icon ?? Users;
  const finalTitle = title ?? p?.title ?? "Nothing here yet";
  const finalDescription = description ?? p?.description ?? "";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-8 py-14 text-center",
        className
      )}
    >
      <FinalIcon className="size-12 text-brand-200" aria-hidden />
      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foreground">
        {finalTitle}
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">{finalDescription}</p>
      {action ? (
        action.href ? (
          <Button
            variant="default"
            className="mt-2 shadow-[var(--shadow-brand)]"
            nativeButton={false}
            render={<Link href={action.href} />}
          >
            {action.label}
          </Button>
        ) : (
          <Button
            type="button"
            variant="default"
            className="mt-2 shadow-[var(--shadow-brand)]"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
