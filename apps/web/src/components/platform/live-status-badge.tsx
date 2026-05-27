import { cn } from "@/lib/utils";
import type { TenantLiveStatus } from "@/lib/api/platform";

const styles: Record<TenantLiveStatus, string> = {
  LIVE: "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]",
  TRIAL: "border-[var(--brand-500)]/40 bg-[color-mix(in_srgb,var(--brand-500)_14%,transparent)] text-[var(--brand-300)]",
  SETUP: "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]",
  PAST_DUE: "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]",
  CHURNED: "border-border bg-muted/50 text-muted-foreground",
};

const labels: Record<TenantLiveStatus, string> = {
  LIVE: "Live",
  TRIAL: "Trial",
  SETUP: "Setup",
  PAST_DUE: "Past due",
  CHURNED: "Churned",
};

export function LiveStatusBadge({ status }: { status: string }) {
  const key = (status in styles ? status : "SETUP") as TenantLiveStatus;
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", styles[key])}>
      {labels[key]}
    </span>
  );
}
