import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  PENDING: "text-[var(--warning-text)] border-[var(--warning-border)]",
  APPROVED: "text-[var(--success-text)] border-[var(--success-border)]",
  REJECTED: "text-[var(--danger-text)] border-[var(--danger-border)]",
  CANCELLED: "text-muted-foreground border-border",
};

export function LeaveStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        styles[status] ?? styles.CANCELLED
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
