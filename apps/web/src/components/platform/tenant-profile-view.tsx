"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Landmark,
  Loader2,
  Save,
  Server,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LiveStatusBadge } from "@/components/platform/live-status-badge";
import { PaymentStatusBadge } from "@/components/platform/payment-status-badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import {
  downloadPlatformTenantInvoice,
  fetchPlatformTenantDetail,
  patchPlatformTenantBilling,
  patchPlatformTenantOperationalStatus,
  type PlatformTenantDetail,
  type TenantLiveStatus,
  type TenantPaymentStatus,
} from "@/lib/api/platform";
import {
  downloadPlatformPayrollPdf,
  downloadPlatformSubscriptionPdf,
  type PaymentDocumentItem,
} from "@/lib/api/payment-documents";
import { patchPlatformTenantCompanyCode } from "@/lib/api/platform-password-manager";
import { TenantLegalDocumentsManager } from "@/components/organization/tenant-legal-documents-manager";
import { suggestCompanyCodeFromName } from "@/lib/org/default-credentials";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

const OPERATIONAL_OPTIONS: { value: TenantLiveStatus; label: string }[] = [
  { value: "SETUP", label: "Setup" },
  { value: "TRIAL", label: "Trial" },
  { value: "LIVE", label: "Live" },
  { value: "PAST_DUE", label: "Past due" },
  { value: "CHURNED", label: "Churned" },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function marginPercent(fee: number, cost: number) {
  if (fee <= 0) return 0;
  return Math.round(((fee - cost) / fee) * 100);
}

export function TenantProfileView({ tenantId }: { tenantId: string }) {
  const token = usePlatformAuthStore((s) => s.token);
  const qc = useQueryClient();
  const [operationalStatus, setOperationalStatus] = useState<TenantLiveStatus | "">("");
  const [fee, setFee] = useState("");
  const [cost, setCost] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<TenantPaymentStatus>("UNPAID");
  const [billingNotes, setBillingNotes] = useState("");
  const [billingInitialized, setBillingInitialized] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [companyCode, setCompanyCode] = useState("");
  const [companyCodeInitialized, setCompanyCodeInitialized] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["platform", "tenant", tenantId, token],
    queryFn: () => fetchPlatformTenantDetail(token!, tenantId),
    enabled: !!token && !!tenantId,
  });

  useEffect(() => {
    if (!data?.billing || billingInitialized) return;
    setFee(String(data.billing.monthlyFeeInr));
    setCost(String(data.billing.monthlyServerCostInr));
    setPaymentStatus(data.billing.paymentStatus);
    setBillingNotes(data.billing.billingNotes ?? "");
    setBillingInitialized(true);
  }, [data, billingInitialized]);

  useEffect(() => {
    if (data?.liveStatus) setOperationalStatus(data.liveStatus);
  }, [data?.liveStatus]);

  useEffect(() => {
    if (!data || companyCodeInitialized) return;
    setCompanyCode(data.companyCode ?? suggestCompanyCodeFromName(data.name));
    setCompanyCodeInitialized(true);
  }, [data, companyCodeInitialized]);

  const statusMutation = useMutation({
    mutationFn: (status: TenantLiveStatus) =>
      patchPlatformTenantOperationalStatus(token!, tenantId, status),
    onSuccess: () => {
      toast.success("Operational status updated");
      void qc.invalidateQueries({ queryKey: ["platform", "tenant", tenantId] });
      void qc.invalidateQueries({ queryKey: ["platform", "tenants"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Could not update status"),
  });

  const companyCodeMutation = useMutation({
    mutationFn: () => patchPlatformTenantCompanyCode(token!, tenantId, companyCode.trim()),
    onSuccess: () => {
      toast.success("Company code saved");
      void qc.invalidateQueries({ queryKey: ["platform", "tenant", tenantId] });
      void qc.invalidateQueries({ queryKey: ["platform", "tenants"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Could not save company code"),
  });

  const billingMutation = useMutation({
    mutationFn: () =>
      patchPlatformTenantBilling(token!, tenantId, {
        monthlyFeeInr: Number(fee),
        monthlyServerCostInr: Number(cost),
        paymentStatus,
        billingNotes: billingNotes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Billing saved");
      void qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Could not save billing"),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading tenant profile…</p>;
  }

  if (isError || !data) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">Tenant not found.</p>
        <Link href="/platform/tenants" className="mt-2 inline-block text-sm underline">
          Back to tenants
        </Link>
      </div>
    );
  }

  const loginUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/login?tenant=${encodeURIComponent(data.slug)}`
      : `/login?tenant=${data.slug}`;

  const feeNum = Number(fee) || 0;
  const costNum = Number(cost) || 0;
  const margin = feeNum - costNum;
  const marginPct = marginPercent(feeNum, costNum);

  const sections = [
    { id: "usage", label: "Usage" },
    { id: "workspace", label: "Workspace" },
    { id: "legal", label: "Legal documents" },
    ...(data.billing ? [{ id: "billing", label: "Billing" }] : []),
    { id: "subscription", label: "Subscription" },
    { id: "payroll", label: "Payroll" },
    { id: "payment-docs", label: "Payment documents" },
    { id: "contacts", label: "Contacts" },
  ];

  async function handleDownloadSubscriptionHtml(doc: Extract<PaymentDocumentItem, { kind: "SUBSCRIPTION" }>) {
    if (!token) return;
    setDownloadingKey(`html:${doc.id}`);
    try {
      const safe =
        doc.periodLabel.replace(/[^\dA-Za-z]+/g, "-").replace(/^-|-$/g, "") || doc.id.slice(0, 8);
      await downloadPlatformTenantInvoice(
        token,
        tenantId,
        doc.id,
        `vetan-invoice-${data!.slug}-${safe}.html`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloadingKey(null);
    }
  }

  async function handleDownloadPdf(doc: PaymentDocumentItem) {
    if (!token) return;
    setDownloadingKey(`pdf:${doc.kind}:${doc.id}`);
    try {
      if (doc.kind === "SUBSCRIPTION") {
        await downloadPlatformSubscriptionPdf(token, tenantId, doc.id, doc.pdfFilename);
      } else {
        await downloadPlatformPayrollPdf(token, tenantId, doc.id, doc.pdfFilename);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setDownloadingKey(null);
    }
  }

  const paymentDocuments = data.paymentDocuments ?? [];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/platform/tenants" className="text-sm text-muted-foreground hover:underline">
          ← All tenants
        </Link>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">{data.name}</h1>
            {data.legalName && data.legalName !== data.name ? (
              <p className="mt-1 text-sm text-muted-foreground">Legal: {data.legalName}</p>
            ) : null}
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {data.companyCode ? (
                <>
                  <span>
                    Code <span className="font-mono font-semibold text-foreground">{data.companyCode}</span>
                  </span>
                  <span>·</span>
                </>
              ) : null}
              <span className="font-mono">{data.slug}</span>
              <span>·</span>
              <span>{data.country}</span>
              {data.industry ? (
                <>
                  <span>·</span>
                  <span>{data.industry}</span>
                </>
              ) : null}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Provisioned {formatDate(data.createdAt)}
              {data.updatedAt !== data.createdAt
                ? ` · Updated ${formatDate(data.updatedAt)}`
                : ""}
            </p>
            <a
              href={loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--brand-500)] hover:underline"
            >
              Customer login URL <ExternalLink className="size-3" />
            </a>
          </div>
          <GlassCard level={2} className="w-full shrink-0 p-4 lg:max-w-xs">
            <p className="text-xs font-medium text-muted-foreground">Operational status</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LiveStatusBadge status={data.liveStatus} />
            </div>
            <select
              className="mt-3 flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={operationalStatus || data.liveStatus}
              onChange={(e) => setOperationalStatus(e.target.value as TenantLiveStatus)}
            >
              {OPERATIONAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Updates subscription and workspace onboarding flags that drive the live badge.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3 w-full"
              disabled={
                statusMutation.isPending ||
                (operationalStatus || data.liveStatus) === data.liveStatus
              }
              onClick={() =>
                statusMutation.mutate((operationalStatus || data.liveStatus) as TenantLiveStatus)
              }
            >
              {statusMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Apply status"
              )}
            </Button>
          </GlassCard>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-4">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <section id="usage" className="scroll-mt-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Usage
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Employees",
              value: data.counts.activeEmployees,
              sub: `${data.counts.employees} total`,
              icon: Users,
            },
            {
              label: "Departments",
              value: data.counts.departments,
              sub: "",
              icon: Building2,
            },
            {
              label: "Payroll runs",
              value: data.counts.payrollRuns,
              sub: "",
              icon: Calendar,
            },
            {
              label: "Leave requests",
              value: data.counts.leaveRequests,
              sub: `${data.counts.auditLogs} audit events`,
              icon: FileText,
            },
          ].map(({ label, value, sub, icon: Icon }) => {
            const card = (
              <GlassCard key={label} level={2} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <Icon className="size-4 text-muted-foreground/60" />
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
                {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
              </GlassCard>
            );
            if (label === "Employees") {
              return (
                <Link
                  key={label}
                  href={`/platform/employees?tenantId=${encodeURIComponent(tenantId)}`}
                  className="block transition-opacity hover:opacity-90"
                >
                  {card}
                </Link>
              );
            }
            if (label === "Departments") {
              return (
                <Link
                  key={label}
                  href={`/platform/organization?tenantId=${encodeURIComponent(tenantId)}&tab=departments`}
                  className="block transition-opacity hover:opacity-90"
                >
                  {card}
                </Link>
              );
            }
            return card;
          })}
        </div>
      </section>

      <section id="workspace" className="scroll-mt-6">
        <GlassCard
          level={2}
          header={
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Landmark className="size-4" />
              Workspace & statutory
            </h2>
          }
        >
          <div className="mb-6">
            <Label htmlFor="companyCode">Company code</Label>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <Input
                id="companyCode"
                value={companyCode}
                onChange={(e) =>
                  setCompanyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))
                }
                className="max-w-[8rem] font-mono uppercase"
                maxLength={8}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={companyCodeMutation.isPending || companyCode.trim().length < 2}
                onClick={() => companyCodeMutation.mutate()}
              >
                {companyCodeMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save code
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Unique across all tenants. Used for employee portal usernames and default password prefix.
            </p>
          </div>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Company PAN</dt>
              <dd className="mt-1 font-mono">{data.workspaceSettings.pan ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Monthly pay day</dt>
              <dd className="mt-1 font-mono tabular-nums">
                {data.workspaceSettings.payDay ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Workspace onboarding</dt>
              <dd className="mt-1">
                {data.onboardingCompletedAt
                  ? `Completed ${formatDate(data.onboardingCompletedAt)}`
                  : "In progress"}
              </dd>
            </div>
          </dl>
        </GlassCard>
      </section>

      <section id="legal" className="scroll-mt-6">
        <TenantLegalDocumentsManager
          mode="platform"
          tenantId={tenantId}
          documents={data.legalDocuments ?? []}
          canManage
          token={token}
          queryKeyToInvalidate={["platform", "tenant", tenantId, token]}
        />
      </section>

      {data.billing ? (
        <section id="billing" className="scroll-mt-6">
          <GlassCard
            level={2}
            header={
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <IndianRupeeIcon />
                Your billing & margin
              </h2>
            }
          >
            <p className="mb-4 text-xs text-muted-foreground">
              What you charge this customer vs your estimated hosting cost (Vetan operator books).
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-[var(--success-border)]/40 bg-[var(--success-bg)]/30 p-4">
                <p className="text-xs text-muted-foreground">Monthly revenue</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--success-text)]">
                  {formatCurrency(feeNum)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Server className="size-3" /> Est. server cost
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(costNum)}</p>
              </div>
              <div
                className={cn(
                  "rounded-xl border p-4",
                  margin >= 0
                    ? "border-[var(--brand-500)]/30 bg-[color-mix(in_srgb,var(--brand-500)_10%,transparent)]"
                    : "border-[var(--danger-border)] bg-[var(--danger-bg)]/30"
                )}
              >
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="size-3" /> Margin
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatCurrency(margin)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({marginPct}%)
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Monthly fee (INR)</Label>
                <Input value={fee} onChange={(e) => setFee(e.target.value)} type="number" min={0} />
              </div>
              <div className="space-y-2">
                <Label>Server cost (INR)</Label>
                <Input value={cost} onChange={(e) => setCost(e.target.value)} type="number" min={0} />
              </div>
              <div className="space-y-2">
                <Label>Payment status</Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as TenantPaymentStatus)}
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="WAIVED">Waived</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label>Notes</Label>
                <Input
                  value={billingNotes}
                  onChange={(e) => setBillingNotes(e.target.value)}
                  placeholder="PO, terms…"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <PaymentStatusBadge status={data.billing.paymentStatus} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Last paid:{" "}
                  {data.billing.lastPaidAt ? formatDate(data.billing.lastPaidAt) : "—"}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => billingMutation.mutate()}
                disabled={billingMutation.isPending}
              >
                {billingMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save billing
              </Button>
            </div>
          </GlassCard>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section id="subscription" className="scroll-mt-6">
          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Product subscription</h2>}>
            {data.subscription ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="font-medium">{data.subscription.planCode ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium capitalize">
                    {data.subscription.status.toLowerCase()}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Trial ends</dt>
                  <dd>
                    {data.subscription.trialEndsAt
                      ? formatDate(data.subscription.trialEndsAt)
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Current period end</dt>
                  <dd>
                    {data.subscription.currentPeriodEnd
                      ? formatDate(data.subscription.currentPeriodEnd)
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Razorpay</dt>
                  <dd>{data.subscription.razorpayConfigured ? "Connected" : "Not linked"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No subscription record.</p>
            )}
          </GlassCard>
        </section>

        <section id="payroll" className="scroll-mt-6">
          <GlassCard level={2} header={<h2 className="text-sm font-semibold">Payroll snapshot</h2>}>
            {data.lastPayroll ? (
              <div className="text-sm">
                <p className="font-medium">
                  {MONTHS[data.lastPayroll.periodMonth - 1]} {data.lastPayroll.periodYear}
                </p>
                <p className="mt-1 capitalize text-muted-foreground">
                  Status: {data.lastPayroll.status.toLowerCase()}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Full payroll history per tenant will be available in a dedicated view later.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payroll runs yet.</p>
            )}
          </GlassCard>
        </section>
      </div>

      <section id="payment-docs" className="scroll-mt-6">
        <GlassCard
          level={2}
          header={<h2 className="text-sm font-semibold">Payment documents</h2>}
        >
          <p className="mb-3 text-xs text-muted-foreground">
            PDF receipts for subscription charges and payroll runs (approved or disbursed). For
            subscription rows you can also download the legacy HTML invoice.
          </p>
          {paymentDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment documents yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 text-right font-medium">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentDocuments.map((doc) => {
                    const dateShown =
                      doc.kind === "SUBSCRIPTION" ? doc.paidAt ?? doc.createdAt : doc.createdAt;
                    const subInv = data.invoices.find((i) => i.id === doc.id);
                    const typeLabel = doc.kind === "SUBSCRIPTION" ? "Subscription" : "Payroll";
                    const detail =
                      doc.kind === "PAYROLL"
                        ? `${doc.employeeCount} employees · gross ${formatCurrency(doc.grossInr)}`
                        : doc.title;

                    return (
                      <tr key={`${doc.kind}-${doc.id}`} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 text-muted-foreground">{typeLabel}</td>
                        <td className="py-2.5">
                          <p className="font-medium">{doc.periodLabel}</p>
                          <p className="text-xs text-muted-foreground">{detail}</p>
                        </td>
                        <td className="py-2.5 font-mono tabular-nums">
                          {formatCurrency(doc.amountInr)}
                        </td>
                        <td className="py-2.5 capitalize text-muted-foreground">
                          {doc.status.toLowerCase()}
                        </td>
                        <td className="py-2.5 text-muted-foreground">{formatDate(dateShown)}</td>
                        <td className="py-2.5 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={downloadingKey !== null}
                              onClick={() => void handleDownloadPdf(doc)}
                            >
                              {downloadingKey === `pdf:${doc.kind}:${doc.id}` ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Download className="size-3" />
                              )}
                              PDF
                            </Button>
                            {doc.kind === "SUBSCRIPTION" ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                disabled={downloadingKey !== null}
                                onClick={() => void handleDownloadSubscriptionHtml(doc)}
                              >
                                {downloadingKey === `html:${doc.id}` ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : null}
                                HTML
                              </Button>
                            ) : null}
                            {doc.kind === "SUBSCRIPTION" && subInv?.pdfUrl ? (
                              <a
                                href={subInv.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--brand-500)] hover:underline"
                              >
                                External
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </section>

      <section id="contacts" className="scroll-mt-6">
        <GlassCard
          level={2}
          header={<h2 className="text-sm font-semibold">Primary contacts</h2>}
        >
          <p className="mb-3 text-xs text-muted-foreground">
            Workspace administrators — for billing and support outreach.
          </p>
          {data.tenantAdmins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin users found.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {data.tenantAdmins.map((a) => (
                <li key={a.email} className="flex flex-wrap justify-between gap-2 py-3 first:pt-0">
                  <span className="text-sm">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-muted-foreground"> · {a.email}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    since {formatDate(a.since)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </section>
    </div>
  );
}

function IndianRupeeIcon() {
  return (
    <span className="flex size-4 items-center justify-center text-xs font-bold" aria-hidden>
      ₹
    </span>
  );
}
