"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PaymentStatusBadge } from "@/components/platform/payment-status-badge";
import { GlassCard } from "@/components/ui/glass-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/components/ui/metric-card";
import { ApiError } from "@/lib/api/client";
import {
  fetchPlatformBillingOverview,
  fetchPlatformBillingTenants,
  patchPlatformTenantBilling,
  type TenantPaymentStatus,
} from "@/lib/api/platform";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { IndianRupee, Server, TrendingUp, AlertTriangle } from "lucide-react";

const filters: { label: string; value: TenantPaymentStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Paid", value: "PAID" },
  { label: "Unpaid", value: "UNPAID" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Waived", value: "WAIVED" },
];

export default function PlatformBillingPage() {
  const token = usePlatformAuthStore((s) => s.token);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenantPaymentStatus | "">("");
  const [editId, setEditId] = useState<string | null>(null);
  const [fee, setFee] = useState("");
  const [cost, setCost] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<TenantPaymentStatus>("UNPAID");
  const [notes, setNotes] = useState("");

  const overviewQuery = useQuery({
    queryKey: ["platform", "billing", "overview", token],
    queryFn: () => fetchPlatformBillingOverview(token!),
    enabled: !!token,
  });

  const tenantsQuery = useQuery({
    queryKey: ["platform", "billing", "tenants", token, search, statusFilter],
    queryFn: () =>
      fetchPlatformBillingTenants(token!, {
        search: search || undefined,
        paymentStatus: statusFilter || undefined,
      }),
    enabled: !!token,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      patchPlatformTenantBilling(token!, editId!, {
        monthlyFeeInr: Number(fee),
        monthlyServerCostInr: Number(cost),
        paymentStatus,
        billingNotes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Billing updated");
      setEditId(null);
      void qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });

  const rows = tenantsQuery.data ?? [];
  const o = overviewQuery.data;

  function openEdit(row: (typeof rows)[0]) {
    setEditId(row.tenantId);
    setFee(String(row.monthlyFeeInr));
    setCost(String(row.monthlyServerCostInr));
    setPaymentStatus(row.paymentStatus);
    setNotes(row.billingNotes ?? "");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
          Billing & infrastructure costs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track whether each client paid their subscription and your estimated server overhead per tenant.
        </p>
      </div>

      {o ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Monthly revenue"
            value={o.totalMonthlyRevenueInr}
            format="currency"
            icon={IndianRupee}
          />
          <MetricCard
            label="Server costs"
            value={o.totalMonthlyServerCostInr}
            format="currency"
            icon={Server}
          />
          <MetricCard
            label="Net margin"
            value={o.totalMonthlyMarginInr}
            format="currency"
            icon={TrendingUp}
          />
          <MetricCard
            label="Overdue"
            value={o.overdueTenants}
            format="number"
            icon={AlertTriangle}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Button
              key={f.label}
              type="button"
              size="sm"
              variant={statusFilter === f.value ? "default" : "secondary"}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search tenant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <GlassCard level={2} className="overflow-hidden p-0">
        {tenantsQuery.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No billing records. Run <code className="rounded bg-muted px-1">npm run seed:demo</code> in api.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tenant</th>
                  <th className="px-4 py-3 text-right font-medium">Subscription</th>
                  <th className="px-4 py-3 text-right font-medium">Server cost</th>
                  <th className="px-4 py-3 text-right font-medium">Margin</th>
                  <th className="px-4 py-3 text-left font-medium">Payment</th>
                  <th className="px-4 py-3 text-left font-medium">Last paid</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.tenantId} className="border-b border-border/60 hover:bg-muted/15">
                    <td className="px-4 py-3">
                      <Link
                        href={`/platform/tenants/${r.tenantId}`}
                        className="font-medium hover:underline"
                      >
                        {r.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {r.slug} · {r.employeeCount} employees · {r.planCode ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {formatCurrency(r.monthlyFeeInr)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                      {formatCurrency(r.monthlyServerCostInr)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--success-text)]">
                      {formatCurrency(r.monthlyMarginInr)}
                      <span className="ml-1 text-xs text-muted-foreground">({r.marginPercent}%)</span>
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={r.paymentStatus} />
                      {r.currentInvoice && r.currentInvoice.status !== "paid" ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Invoice: {r.currentInvoice.status}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.lastPaidAt ? formatDate(r.lastPaidAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/platform/tenants/${r.tenantId}#payment-docs`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          Payment PDFs
                        </Link>
                        <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(r)}>
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {editId ? (
        <GlassCard level={3} className="max-w-lg">
          <h2 className="text-sm font-semibold">Update tenant billing</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="fee">Monthly subscription (INR)</Label>
              <Input id="fee" type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cost">Monthly server cost (INR)</Label>
              <Input id="cost" type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pay-status">Payment status</Label>
              <select
                id="pay-status"
                className="mt-1 flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as TenantPaymentStatus)}
              >
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="WAIVED">Waived</option>
              </select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                className="mt-1 flex min-h-[72px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                Save
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}
