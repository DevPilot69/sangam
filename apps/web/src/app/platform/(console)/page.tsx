"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, Building2, IndianRupee, Server, TrendingUp, Users, UserCircle } from "lucide-react";

import { PaymentStatusBadge } from "@/components/platform/payment-status-badge";

import { GlassCard } from "@/components/ui/glass-card";
import { MetricCard } from "@/components/ui/metric-card";
import { fetchPlatformTelemetry } from "@/lib/api/platform";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

export default function PlatformDashboardPage() {
  const token = usePlatformAuthStore((s) => s.token);

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "telemetry", token],
    queryFn: () => fetchPlatformTelemetry(token!),
    enabled: !!token,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
          Platform telemetry
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SaaS-wide metrics across all Vetan workspaces.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading telemetry…</p>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Tenants" value={data.tenants} format="number" icon={Building2} />
            <MetricCard label="Users" value={data.users} format="number" icon={UserCircle} />
            <MetricCard label="Employees" value={data.employees} format="number" icon={Users} />
            <MetricCard
              label="Est. MRR"
              value={data.estimatedMrrInr}
              format="currency"
              icon={IndianRupee}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Server costs"
              value={data.totalMonthlyServerCostInr ?? 0}
              format="currency"
              icon={Server}
            />
            <MetricCard
              label="Net margin"
              value={data.totalMonthlyMarginInr ?? 0}
              format="currency"
              icon={TrendingUp}
            />
            <MetricCard label="Paid" value={data.paidTenants ?? 0} format="number" icon={Building2} />
            <MetricCard label="Overdue" value={data.overdueTenants ?? 0} format="number" icon={AlertTriangle} />
          </div>

          <Link href="/platform/billing" className="text-sm font-medium text-[var(--brand-500)] hover:underline">
            Billing & cost monitor →
          </Link>

          <div className="grid gap-4 md:grid-cols-3">
            <GlassCard level={2}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Subscriptions
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.activeSubscriptions} active</p>
              <p className="text-sm text-muted-foreground">{data.trialingSubscriptions} trialing</p>
            </GlassCard>
            <GlassCard level={2}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Payroll runs
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.payrollRunsDisbursed}</p>
              <p className="text-sm text-muted-foreground">disbursed (all time)</p>
            </GlassCard>
            <GlassCard level={2}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Growth
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.newTenantsLast30Days}</p>
              <p className="text-sm text-muted-foreground">new tenants (30d)</p>
            </GlassCard>
          </div>

          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Recent tenants</h2>}>
            <ul className="divide-y divide-border">
              {data.recentTenants.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <Link href={`/platform/tenants/${t.id}`} className="font-medium hover:underline">
                      {t.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {t.slug} · {t.employeeCount} employees · {t.userCount} users
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {t.paymentStatus ? <PaymentStatusBadge status={t.paymentStatus} /> : null}
                    <span className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/platform/tenants" className="mt-4 inline-block text-sm text-[var(--brand-500)]">
              View all tenants →
            </Link>
          </GlassCard>

          {Object.keys(data.planBreakdown).length > 0 ? (
            <GlassCard level={2} header={<h2 className="text-sm font-semibold">Plans</h2>}>
              <ul className="space-y-2 text-sm">
                {Object.entries(data.planBreakdown).map(([plan, count]) => (
                  <li key={plan} className="flex justify-between">
                    <span className="capitalize">{plan}</span>
                    <span className="font-mono">{count}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
