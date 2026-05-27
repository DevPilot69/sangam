"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ApiError } from "@/lib/api/client";
import { fetchLeaveRequests, patchLeaveRequestStatus } from "@/lib/api/leave";
import { Permission } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/auth/auth-store";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { cn } from "@/lib/utils";

type TabStatus = "PENDING" | "ALL";

export default function LeavePage() {
  const token = useAuthStore((s) => s.token);
  const { hasPermission } = usePermissions();
  const canApprove = hasPermission(Permission["leave:approve"]);
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabStatus>("PENDING");

  const requestsQuery = useQuery({
    queryKey: ["leave", "requests", tab, token],
    queryFn: () =>
      fetchLeaveRequests(token!, {
        status: tab === "PENDING" ? "PENDING" : undefined,
        limit: 80,
      }),
    enabled: !!token,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      patchLeaveRequestStatus(token!, id, status),
    onSuccess: () => {
      toast.success("Leave request updated.");
      void qc.invalidateQueries({ queryKey: ["leave"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });

  const rows = requestsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Leave management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review requests with employee reasons. Approve or reject pending leave.
        </p>
      </div>

      <div className="flex gap-2">
        {(["PENDING", "ALL"] as TabStatus[]).map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
          >
            {t === "PENDING" ? "Pending" : "All requests"}
          </Button>
        ))}
      </div>

      <GlassCard level={2} className="overflow-hidden p-0">
        {requestsQuery.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {tab === "PENDING" ? "No pending leave requests." : "No leave requests found."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Employee</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Dates</th>
                  <th className="px-4 py-3 text-left font-medium">Days</th>
                  <th className="px-4 py-3 text-left font-medium min-w-[10rem]">Reason</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.employeeName}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{r.employeeCode}</span>
                    </td>
                    <td className="px-4 py-3">{r.leaveTypeName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.startDate} → {r.endDate}
                    </td>
                    <td className="px-4 py-3">{r.workingDays}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.reason?.trim() ? (
                        <span className="line-clamp-3" title={r.reason}>
                          {r.reason}
                        </span>
                      ) : (
                        <span className="italic text-muted-foreground/70">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          r.status === "PENDING" && "bg-[var(--warning-bg)] text-[var(--warning-text)]",
                          r.status === "APPROVED" && "bg-[var(--success-bg)] text-[var(--success-text)]",
                          r.status === "REJECTED" && "bg-destructive/10 text-destructive"
                        )}
                      >
                        {r.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "PENDING" && canApprove ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate({ id: r.id, status: "REJECTED" })}
                          >
                            Reject
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate({ id: r.id, status: "APPROVED" })}
                          >
                            Approve
                          </Button>
                        </div>
                      ) : r.status === "PENDING" ? (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
