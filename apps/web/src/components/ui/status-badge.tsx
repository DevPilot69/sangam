import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  Lock,
  Send,
  ShieldAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { PayrollRunStatus } from "@/types";

const config: Record<
  PayrollRunStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  draft: {
    label: "Draft",
    className: "border-border bg-muted text-muted-foreground",
    Icon: CircleDashed,
  },
  processing: {
    label: "Processing",
    className: "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-text)]",
    Icon: Loader2,
  },
  pending: {
    label: "Pending approval",
    className: "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]",
    Icon: Clock,
  },
  approved: {
    label: "Approved",
    className: "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]",
    Icon: CheckCircle2,
  },
  locked: {
    label: "Locked",
    className: "border-[color-mix(in_srgb,var(--brand-500)_35%,transparent)] bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] text-[var(--brand-300)]",
    Icon: Lock,
  },
  disbursed: {
    label: "Disbursed",
    className: "border-[color-mix(in_srgb,var(--accent-500)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-500)_12%,transparent)] text-[var(--accent-400)]",
    Icon: Send,
  },
  error: {
    label: "Error",
    className: "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]",
    Icon: ShieldAlert,
  },
};

const employmentConfig = {
  active: {
    label: "Active",
    className: "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]",
    Icon: CheckCircle2,
  },
  on_leave: {
    label: "On leave",
    className: "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-text)]",
    Icon: Clock,
  },
  notice: {
    label: "Notice period",
    className: "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]",
    Icon: AlertCircle,
  },
  inactive: {
    label: "Inactive",
    className: "border-border bg-muted text-muted-foreground",
    Icon: CircleDashed,
  },
} as const;

export function PayrollStatusBadge({
  status,
  size = "default",
}: {
  status: PayrollRunStatus;
  size?: "sm" | "default";
}) {
  const { label, className, Icon } = config[status];
  return (
    <span
      role="status"
      aria-label={`Payroll status: ${label}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium",
        size === "sm" ? "text-[11px]" : "text-xs",
        className
      )}
    >
      <Icon className={cn("size-3.5", status === "processing" && "animate-spin")} aria-hidden />
      {label}
    </span>
  );
}

export function EmploymentStatusBadge({
  status,
  size = "default",
}: {
  status: keyof typeof employmentConfig;
  size?: "sm" | "default";
}) {
  const { label, className, Icon } = employmentConfig[status];
  return (
    <span
      role="status"
      aria-label={`Employment status: ${label}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium",
        size === "sm" ? "text-[11px]" : "text-xs",
        className
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
