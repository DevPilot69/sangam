"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { LiveStatusBadge } from "@/components/platform/live-status-badge";
import { PaymentStatusBadge } from "@/components/platform/payment-status-badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { fetchPlatformTenants, type TenantLiveStatus } from "@/lib/api/platform";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

const LIVE_FILTERS: { value: "all" | TenantLiveStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "LIVE", label: "Live" },
  { value: "TRIAL", label: "Trial" },
  { value: "SETUP", label: "Setup" },
  { value: "PAST_DUE", label: "Past due" },
  { value: "CHURNED", label: "Churned" },
];

export default function PlatformTenantsPage() {
  const token = usePlatformAuthStore((s) => s.token);
  const [search, setSearch] = useState("");
  const [liveFilter, setLiveFilter] = useState<"all" | TenantLiveStatus>("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["platform", "tenants", token, search],
    queryFn: () => fetchPlatformTenants(token!, search || undefined),
    enabled: !!token,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (liveFilter === "all") return data;
    return data.filter((t) => t.liveStatus === liveFilter);
  }, [data, liveFilter]);

  const stats = useMemo(() => {
    if (!data) return null;
    return {
      total: data.length,
      live: data.filter((t) => t.liveStatus === "LIVE").length,
      setup: data.filter((t) => t.liveStatus === "SETUP").length,
      employees: data.reduce((s, t) => s + t.employeeCount, 0),
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Tenants</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every organization onboarded on Vetan. Open a row for the full profile, or add a new tenant to
            run guided onboarding.
          </p>
          {stats ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {stats.total} workspaces · {stats.live} live · {stats.setup} in setup ·{" "}
              {stats.employees.toLocaleString()} employees total
            </p>
          ) : null}
        </div>
        <Link href="/platform/tenants/new">
          <Button>
            <Plus className="size-4" />
            Add tenant
          </Button>
        </Link>
      </div>

      <GlassCard level={2} className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={liveFilter}
            onChange={(e) => setLiveFilter(e.target.value as "all" | TenantLiveStatus)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            aria-label="Filter by live status"
          >
            {LIVE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </GlassCard>

      <GlassCard level={2} className="overflow-hidden p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading tenants…</p>
        ) : isError ? (
          <p className="p-6 text-sm text-[var(--danger-text)]">Could not load tenants. Is the API running?</p>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <Building2 className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {data?.length ? "No tenants match your filters." : "No tenants yet."}
            </p>
            {!data?.length ? (
              <Link href="/platform/tenants/new">
                <Button variant="outline" size="sm">
                  Onboard your first tenant
                </Button>
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Organization</th>
                  <th className="px-4 py-3 text-left font-medium">Live</th>
                  <th className="px-4 py-3 text-right font-medium">Employees</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue / mo</th>
                  <th className="px-4 py-3 text-right font-medium">Cost / mo</th>
                  <th className="px-4 py-3 text-right font-medium">Margin</th>
                  <th className="px-4 py-3 text-left font-medium">Payment</th>
                  <th className="px-4 py-3 text-left font-medium">Provisioned</th>
                  <th className="px-4 py-3 text-left font-medium">Onboarded</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link href={`/platform/tenants/${t.id}`} className="font-medium hover:underline">
                        {t.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {t.companyCode ? (
                          <span className="font-mono font-medium text-foreground">{t.companyCode}</span>
                        ) : null}
                        {t.companyCode ? " · " : null}
                        {t.slug}
                        {t.industry ? ` · ${t.industry}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <LiveStatusBadge status={t.liveStatus} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{t.employeeCount}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {t.billing ? formatCurrency(t.billing.monthlyFeeInr) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                      {t.billing ? formatCurrency(t.billing.monthlyServerCostInr) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-mono tabular-nums",
                        t.billing && t.billing.monthlyMarginInr >= 0
                          ? "text-[var(--success-text)]"
                          : "text-[var(--danger-text)]"
                      )}
                    >
                      {t.billing ? formatCurrency(t.billing.monthlyMarginInr) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {t.billing ? <PaymentStatusBadge status={t.billing.paymentStatus} /> : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t.onboardedAt ? (
                        <span className="text-muted-foreground">{formatDate(t.onboardedAt)}</span>
                      ) : (
                        <span className="text-xs text-[var(--warning-text)]">Pending</span>
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


