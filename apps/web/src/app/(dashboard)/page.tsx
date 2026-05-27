"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, CalendarClock, ClipboardList, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PayrollStatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { buttonVariants } from "@/components/ui/button";
import { Permission } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/auth/auth-store";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { dashboardRepository } from "@/lib/repositories/dashboard.repository";
import { payrollRepository } from "@/lib/repositories/payroll.repository";
import { apiPayrollRunsToRows } from "@/lib/mappers/payroll.mapper";
import { formatCurrency, formatDate, formatLakhAbbrev } from "@/lib/utils/formatters";

export default function DashboardPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { hasPermission } = usePermissions();

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary", token],
    queryFn: () => dashboardRepository.summary(token!),
    enabled: !!token && hasPermission(Permission["payroll:read"]),
  });

  const runsQuery = useQuery({
    queryKey: ["payroll", "runs", token, 5],
    queryFn: () => payrollRepository.listRuns(token!, { limit: 5 }),
    enabled: !!token && hasPermission(Permission["payroll:read"]),
  });

  const runs = runsQuery.data ? apiPayrollRunsToRows(runsQuery.data) : [];
  const summary = summaryQuery.data;
  const trend = summary?.payrollTrend ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Payroll health, trends, and the next actions for your team.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total payroll (month)"
          value={summary?.totalPayrollMonth ?? 0}
          trend={{ value: 4.2, positive: true }}
          icon={Users}
        />
        <MetricCard
          label="Active employees"
          value={summary?.activeEmployees ?? 0}
          format="number"
          trend={{ value: 2.1, positive: true }}
          icon={Users}
        />
        <MetricCard
          label="Pending approvals"
          value={summary?.pendingApprovals ?? 0}
          format="number"
          icon={ClipboardList}
        />
        <MetricCard
          label="Days to payroll"
          value={summary?.daysToPayroll ?? 0}
          format="number"
          icon={CalendarClock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard level={2} className="lg:col-span-2" header={<h2 className="text-sm font-semibold">Payroll cost trend</h2>}>
          <div className="h-64 w-full chart-theme">
            {trend.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {summaryQuery.isLoading ? "Loading…" : "No payroll history yet. Run npm run seed:demo in api/."}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="payrollGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--chart-axis)" tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} />
                  <YAxis
                    stroke="var(--chart-axis)"
                    tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                    tickFormatter={(v) => formatLakhAbbrev(Number(v))}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--chart-tooltip-bg)",
                      border: "1px solid var(--border-default)",
                      borderRadius: 12,
                      color: "var(--text-primary)",
                    }}
                    formatter={(val) => [formatCurrency(Number(val ?? 0)), "Payroll"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fill="url(#payrollGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        <GlassCard level={2} header={<h2 className="text-sm font-semibold">Quick actions</h2>}>
          <ul className="space-y-2">
            {[
              { label: "Run payroll", href: "/payroll/run", perm: Permission["payroll:run"], icon: ClipboardList },
              { label: "Add employee", href: "/employees/new", perm: Permission["employees:write"], icon: UserPlus },
              { label: "Approve leaves", href: "/leave", perm: Permission["leave:approve"], icon: Users },
              { label: "Download report", href: "/reports", perm: Permission["reports:read"], icon: ArrowRight },
            ].map((a) => {
              const allowed = hasPermission(a.perm);
              return (
                <li key={a.href}>
                  <Link
                    href={allowed ? a.href : "#"}
                    className={`flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm transition-transform hover:-translate-y-0.5 ${
                      allowed ? "hover:border-[var(--brand-500)]/40" : "cursor-not-allowed opacity-50"
                    }`}
                    aria-disabled={!allowed}
                    onClick={(e) => {
                      if (!allowed) e.preventDefault();
                    }}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <a.icon className="size-4 text-[var(--brand-400)]" />
                      {a.label}
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </GlassCard>
      </div>

      <GlassCard level={2} header={<h2 className="text-sm font-semibold">Recent payroll runs</h2>}>
        {runsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading payroll runs…</p>
        ) : runs.length === 0 ? (
          <EmptyState variant="payroll" action={{ label: "Run first payroll", href: "/payroll/run" }} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border table-glass">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Recent payroll runs</caption>
              <thead>
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Period
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Employees
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Gross pay
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/payroll/${r.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/payroll/${r.id}`);
                    }}
                    tabIndex={0}
                    role="link"
                  >
                    <td className="px-4 py-3 font-medium">{r.period}</td>
                    <td className="px-4 py-3">{r.employeeCount}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(r.grossPay)}</td>
                    <td className="px-4 py-3">
                      <PayrollStatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-border px-4 py-3 text-right">
              <Link href="/payroll" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                View all runs →
              </Link>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}