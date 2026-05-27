"use client";

import type { MeLeaveBalance } from "@/lib/api/employee-portal";
import { wholeLeaveDays } from "@/lib/utils/leave-display";

type LeaveBalancePanelProps = {
  balances: MeLeaveBalance[];
  isLoading?: boolean;
  /** Tighter spacing and smaller padding (e.g. dashboard card). */
  compact?: boolean;
};

export function LeaveBalancePanel({ balances, isLoading, compact }: LeaveBalancePanelProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (balances.length === 0) {
    return <p className="text-sm text-muted-foreground">No leave balances yet.</p>;
  }

  const yearLabel = balances[0]?.year;

  const th = compact ? "px-3 py-2" : "px-4 py-3";
  const td = compact ? "px-3 py-2" : "px-4 py-3";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className="text-xs text-muted-foreground">
        Days remaining are shown as whole numbers
        {yearLabel != null ? ` for the ${yearLabel} leave year` : ""}.
      </p>
      <div
        className={
          compact
            ? "max-h-56 overflow-y-auto overflow-x-auto rounded-lg border border-border/80"
            : "overflow-x-auto rounded-lg border border-border/80"
        }
      >
        <table className="w-full min-w-[280px] text-sm">
          <thead className="sticky top-0 z-[1] bg-muted/90 backdrop-blur-sm">
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className={th}>Leave type</th>
              <th className={`${th} text-right`}>Days left</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.id} className="border-b border-border/60 last:border-0">
                <td className={td}>
                  <span className="font-medium text-foreground">{b.leaveTypeName}</span>
                  {b.leaveTypeCode && b.leaveTypeCode.toLowerCase() !== b.leaveTypeName.toLowerCase() ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({b.leaveTypeCode})</span>
                  ) : null}
                </td>
                <td className={`${td} text-right tabular-nums`}>
                  <span className="text-base font-semibold">{wholeLeaveDays(b.balanceDays)}</span>
                  <span className="ml-1 text-xs font-normal text-muted-foreground">days</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
