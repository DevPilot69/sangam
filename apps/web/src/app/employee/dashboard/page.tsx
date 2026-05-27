"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, ClipboardList, Clock, UserRound } from "lucide-react";
import Link from "next/link";

import { ApplyLeaveDialog } from "@/components/employee/apply-leave-dialog";
import { HolidayCalendarPanel } from "@/components/employee/holiday-calendar-panel";
import { LeaveBalancePanel } from "@/components/employee/leave-balance-panel";
import { LeaveStatusBadge } from "@/components/employee/leave-status-badge";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonVariants } from "@/components/ui/button";
import {
  fetchMeAttendanceSummary,
  fetchMeDashboard,
  fetchMeLeaveRequests,
  fetchMeProfile,
} from "@/lib/api/employee-portal";
import { useAuthStore } from "@/lib/auth/auth-store";
import { formatCurrency } from "@/lib/utils/formatters";

export default function EmployeeDashboardPage() {
  const token = useAuthStore((s) => s.token);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const profileQuery = useQuery({
    queryKey: ["me", "profile", token],
    queryFn: () => fetchMeProfile(token!),
    enabled: !!token,
  });

  const dashboardQuery = useQuery({
    queryKey: ["me", "dashboard", token],
    queryFn: () => fetchMeDashboard(token!),
    enabled: !!token,
  });

  const attendanceQuery = useQuery({
    queryKey: ["me", "attendance-summary", from, to, token],
    queryFn: () => fetchMeAttendanceSummary(token!, from, to),
    enabled: !!token,
  });

  const requestsQuery = useQuery({
    queryKey: ["me", "leave-requests", token],
    queryFn: () => fetchMeLeaveRequests(token!),
    enabled: !!token,
  });

  const data = dashboardQuery.data;
  const profile = profileQuery.data;
  const emp = profile?.employee;
  const firstName = emp?.firstName ?? profile?.user?.name?.split(" ")?.[0] ?? "there";
  const pending = (requestsQuery.data ?? []).filter((r) => r.status === "PENDING").slice(0, 4);
  const balances = data?.leaveBalances ?? [];
  const att = attendanceQuery.data;

  const slip = data?.latestPayslip;
  const gross = slip?.gross ?? 0;
  const ded = slip?.deductions ?? 0;
  const net = slip?.net ?? 0;
  const total = gross > 0 ? gross : 1;
  const dedPct = Math.min(100, Math.round((ded / total) * 100));
  const netPct = Math.min(100, Math.max(0, Math.round((net / total) * 100)));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greet}</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight md:text-3xl">
            {firstName}, here&apos;s your workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {emp
              ? [
                  emp.designation,
                  emp.department,
                  emp.employeeCode ? `ID ${emp.employeeCode}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Everything below is tied to your employment profile and live payroll data."}
          </p>
        </div>
        <Link
          href="/employee/profile"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "shrink-0 gap-2 self-start md:self-auto",
          })}
        >
          <UserRound className="size-4" />
          View my info
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <GlassCard
          level={2}
          className="sm:col-span-2 xl:col-span-1"
          header={<h2 className="text-sm font-semibold">Latest payslip</h2>}
        >
          {dashboardQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : slip ? (
            <>
              <p className="text-xs text-muted-foreground">{slip.periodLabel}</p>
              <div className="mt-4 flex flex-wrap items-center gap-6">
                <div
                  className="relative mx-auto size-28 shrink-0 rounded-full border-4 border-border bg-muted/30 md:mx-0"
                  style={{
                    background: `conic-gradient(var(--accent-400) 0% ${netPct}%, var(--warning-text) ${netPct}% ${netPct + dedPct}%, var(--muted) ${netPct + dedPct}% 100%)`,
                  }}
                  title="Net vs deductions vs remainder"
                >
                  <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-[var(--surface-1)] text-center text-[10px] leading-tight">
                    <span className="text-muted-foreground">Net</span>
                    <span className="font-mono text-sm font-bold text-[var(--accent-400)]">
                      {formatCurrency(net)}
                    </span>
                  </div>
                </div>
                <dl className="min-w-0 flex-1 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Gross</dt>
                    <dd className="font-mono tabular-nums">{formatCurrency(slip.gross)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Deductions</dt>
                    <dd className="font-mono tabular-nums">{formatCurrency(slip.deductions)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-border pt-2 font-medium">
                    <dt>Net pay</dt>
                    <dd className="font-mono tabular-nums text-[var(--accent-400)]">
                      {formatCurrency(slip.net)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/employee/payslips" className={buttonVariants({ size: "sm" })}>
                  <ClipboardList className="size-4" />
                  All payslips
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No payslip available yet.</p>
          )}
        </GlassCard>

        <GlassCard
          level={2}
          header={<h2 className="text-sm font-semibold">Leave overview</h2>}
        >
          <LeaveBalancePanel
            balances={balances}
            isLoading={dashboardQuery.isLoading}
            compact
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {token ? <ApplyLeaveDialog token={token} /> : null}
            <Link
              href="/employee/leave#balances"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1" })}
            >
              Details
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </GlassCard>

        {token ? (
          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Holiday calendar</h2>}>
            <HolidayCalendarPanel token={token} compact />
            <Link
              href="/employee/leave#holidays"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "mt-4 w-full gap-1",
              })}
            >
              Full holiday list
              <ArrowRight className="size-3" />
            </Link>
          </GlassCard>
        ) : null}

        <GlassCard
          level={2}
          header={<h2 className="text-sm font-semibold">Attendance (30 days)</h2>}
        >
          {attendanceQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : att ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  ["Present", att.present, "text-[var(--success-text)]"],
                  ["Absent", att.absent, "text-[var(--danger-text)]"],
                  ["Late", att.late, "text-[var(--warning-text)]"],
                  ["WFH", att.wfh, "text-[var(--info-text)]"],
                ].map(([label, val, cls]) => (
                  <div key={String(label)} className="rounded-lg border border-border/60 bg-muted/20 px-2 py-3">
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className={`mt-1 text-lg font-semibold tabular-nums ${cls}`}>{val}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/employee/attendance"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "mt-4 w-full gap-2",
                })}
              >
                <Clock className="size-4" />
                Open attendance
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No summary yet.</p>
          )}
        </GlassCard>

        <GlassCard
          level={2}
          className="sm:col-span-2 xl:col-span-2"
          header={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Pending leave</h2>
              {data?.pendingLeaveCount ? (
                <span className="rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-xs font-medium text-[var(--warning-text)]">
                  {data.pendingLeaveCount} pending
                </span>
              ) : null}
            </div>
          }
        >
          {pending.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CalendarDays className="size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No requests waiting for approval.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {pending.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3 text-sm last:border-0 last:pb-0"
                >
                  <span>
                    <span className="font-medium">{r.leaveTypeName}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {r.workingDays} day{r.workingDays !== 1 ? "s" : ""}
                    </span>
                  </span>
                  <LeaveStatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/employee/leave#requests"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "mt-4 w-full gap-1" })}
          >
            All leave activity
            <ArrowRight className="size-3" />
          </Link>
        </GlassCard>

        <GlassCard level={2} header={<h2 className="text-sm font-semibold">Quick links</h2>}>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/employee/documents"
                className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/50"
              >
                Onboarding documents
                <ArrowRight className="size-4 opacity-50" />
              </Link>
            </li>
            <li>
              <Link
                href="/employee/payslips"
                className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/50"
              >
                Payslips
                <ArrowRight className="size-4 opacity-50" />
              </Link>
            </li>
            <li>
              <Link
                href="/employee/leave#apply"
                className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/50"
              >
                Apply for leave
                <ArrowRight className="size-4 opacity-50" />
              </Link>
            </li>
            <li>
              <Link
                href="/employee/attendance"
                className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/50"
              >
                Attendance log
                <ArrowRight className="size-4 opacity-50" />
              </Link>
            </li>
            <li>
              <Link
                href="/employee/profile"
                className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/50"
              >
                Profile & contacts
                <ArrowRight className="size-4 opacity-50" />
              </Link>
            </li>
          </ul>
        </GlassCard>
      </div>

      {data?.recentPayslips && data.recentPayslips.length > 1 ? (
        <GlassCard level={2} header={<h2 className="text-sm font-semibold">Recent payslips</h2>}>
          <ul className="divide-y divide-border/60">
            {data.recentPayslips.slice(0, 5).map((p) => (
              <li key={p.payrollRunId} className="flex justify-between py-3 text-sm first:pt-0">
                <span className="text-muted-foreground">{p.periodLabel}</span>
                <span className="font-mono text-[var(--accent-400)]">{formatCurrency(p.net)}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      ) : null}
    </div>
  );
}
