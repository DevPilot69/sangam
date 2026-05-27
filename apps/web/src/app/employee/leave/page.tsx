"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { ApplyLeaveDialog } from "@/components/employee/apply-leave-dialog";
import { HolidayCalendarPanel } from "@/components/employee/holiday-calendar-panel";
import { LeaveBalancePanel } from "@/components/employee/leave-balance-panel";
import { LeaveStatusBadge } from "@/components/employee/leave-status-badge";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  cancelMeLeaveRequest,
  fetchMeLeaveBalances,
  fetchMeLeaveRequests,
} from "@/lib/api/employee-portal";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function EmployeeLeavePage() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();

  const balancesQuery = useQuery({
    queryKey: ["me", "leave-balances", token],
    queryFn: () => fetchMeLeaveBalances(token!),
    enabled: !!token,
  });

  const requestsQuery = useQuery({
    queryKey: ["me", "leave-requests", token],
    queryFn: () => fetchMeLeaveRequests(token!),
    enabled: !!token,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelMeLeaveRequest(token!, id),
    onSuccess: () => {
      toast.success("Request cancelled");
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Cancel failed"),
  });

  useEffect(() => {
    function scrollToHash() {
      const h = typeof window !== "undefined" ? window.location.hash : "";
      if (!h) return;
      const el = document.querySelector(h);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Leave
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Apply for time off, check balances, and track your requests.
        </p>
      </div>

      <section id="apply" className="scroll-mt-6">
        <GlassCard
          level={2}
          header={<h2 className="text-sm font-semibold">Leave apply</h2>}
        >
          <p className="text-xs text-muted-foreground">
            Submit a new request. Your manager will be notified based on your workspace rules.
          </p>
          {token ? (
            <div className="mt-4">
              <ApplyLeaveDialog token={token} />
            </div>
          ) : null}
        </GlassCard>
      </section>

      <section id="balances" className="scroll-mt-6">
        <GlassCard level={2} header={<h2 className="text-sm font-semibold">Leave balances</h2>}>
          <LeaveBalancePanel balances={balancesQuery.data ?? []} isLoading={balancesQuery.isLoading} />
        </GlassCard>
      </section>

      <section id="holidays" className="scroll-mt-6">
        <GlassCard level={2} header={<h2 className="text-sm font-semibold">Holiday calendar</h2>}>
          {token ? <HolidayCalendarPanel token={token} /> : null}
        </GlassCard>
      </section>

      <section id="requests" className="scroll-mt-6">
      <GlassCard level={2} header={<h2 className="text-sm font-semibold">My requests</h2>}>
        {requestsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (requestsQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave requests yet.</p>
        ) : (
          <ul className="space-y-4">
            {(requestsQuery.data ?? []).map((r) => (
              <li key={r.id} className="flex flex-col gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium">{r.leaveTypeName}</span>
                    <p className="text-xs text-muted-foreground">
                      {r.startDate} → {r.endDate} · {r.workingDays} day{r.workingDays !== 1 ? "s" : ""}
                    </p>
                    {r.reason ? <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p> : null}
                  </div>
                  <LeaveStatusBadge status={r.status} />
                </div>
                {r.status === "PENDING" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start text-[var(--danger-text)]"
                    disabled={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(r.id)}
                  >
                    Cancel request
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
      </section>
    </div>
  );
}

