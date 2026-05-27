import { cn } from "@/lib/utils";

export type TenantPaymentStatus = "PAID" | "UNPAID" | "OVERDUE" | "WAIVED";

const styles: Record<TenantPaymentStatus, string> = {
  PAID: "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]",
  UNPAID: "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]",
  OVERDUE: "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]",
  WAIVED: "border-border bg-muted/50 text-muted-foreground",
};

const labels: Record<TenantPaymentStatus, string> = {
  PAID: "Paid",
  UNPAID: "Unpaid",
  OVERDUE: "Overdue",
  WAIVED: "Waived",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const key = (status in styles ? status : "UNPAID") as TenantPaymentStatus;
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", styles[key])}>
      {labels[key]}
    </span>
  );
}
