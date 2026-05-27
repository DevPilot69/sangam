"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, IndianRupee, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Label } from "@/components/ui/label";
import {
  fetchBillingPricing,
  fetchBillingQuote,
  fetchBillingSummary,
  subscribeBilling,
  verifyBillingPayment,
  type BillingCycle,
  type BillingPlanCode,
  downloadBillingInvoice,
} from "@/lib/api/billing";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { openRazorpayCheckout } from "@/lib/payments/razorpay-checkout";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import {
  downloadTenantPayrollPdf,
  downloadTenantSubscriptionPdf,
  fetchTenantPaymentDocuments,
  type PaymentDocumentItem,
} from "@/lib/api/payment-documents";

const CYCLE_LABELS: Record<BillingCycle, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly (5% off)",
  HALF_YEARLY: "Half-yearly (10% off)",
  YEARLY: "Yearly (15% off)",
};

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function statusLabel(status: string, trialDays: number | null): string {
  if (status === "TRIALING" && trialDays != null) {
    return `Trial · ${trialDays} day${trialDays === 1 ? "" : "s"} left`;
  }
  const map: Record<string, string> = {
    ACTIVE: "Active subscription",
    TRIALING: "Trial",
    PAST_DUE: "Payment past due",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status;
}

function PaymentDocumentRow({ doc, token }: { doc: PaymentDocumentItem; token: string }) {
  const [busy, setBusy] = useState<"pdf" | "html" | null>(null);

  const typeLabel = doc.kind === "SUBSCRIPTION" ? "Subscription" : "Payroll";
  const detail =
    doc.kind === "PAYROLL"
      ? `${doc.employeeCount} employees · gross ${formatCurrency(doc.grossInr)}`
      : doc.title;

  async function savePdf() {
    setBusy("pdf");
    try {
      if (doc.kind === "SUBSCRIPTION") {
        await downloadTenantSubscriptionPdf(token, doc.id, doc.pdfFilename);
      } else {
        await downloadTenantPayrollPdf(token, doc.id, doc.pdfFilename);
      }
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("PDF download failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveHtml() {
    if (doc.kind !== "SUBSCRIPTION") return;
    const safe = doc.periodLabel.replace(/[^\dA-Za-z]+/g, "-").replace(/^-|-$/g, "") || "invoice";
    setBusy("html");
    try {
      await downloadBillingInvoice(token, doc.id, `vetan-invoice-${safe}.html`);
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("HTML download failed");
    } finally {
      setBusy(null);
    }
  }

  const dateKind = doc.kind === "SUBSCRIPTION" ? doc.paidAt ?? doc.createdAt : doc.createdAt;

  return (
    <tr className="border-b border-border/50">
      <td className="py-2.5 text-muted-foreground">{typeLabel}</td>
      <td className="py-2.5">
        <p className="font-medium">{doc.periodLabel}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </td>
      <td className="py-2.5 font-mono tabular-nums">{formatCurrency(doc.amountInr)}</td>
      <td className="py-2.5 capitalize text-muted-foreground">{doc.status.toLowerCase()}</td>
      <td className="py-2.5 text-muted-foreground">{formatDate(dateKind)}</td>
      <td className="py-2.5 text-right">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="gap-1"
            disabled={busy !== null}
            onClick={() => void savePdf()}
          >
            {busy === "pdf" ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
            PDF
          </Button>
          {doc.kind === "SUBSCRIPTION" ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="gap-1"
              disabled={busy !== null}
              onClick={() => void saveHtml()}
            >
              {busy === "html" ? <Loader2 className="size-3 animate-spin" /> : null}
              HTML
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export default function BillingPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanCode>("STARTER");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");

  const { data, isLoading, error } = useQuery({
    queryKey: ["billing", "summary", token],
    queryFn: () => fetchBillingSummary(token!),
    enabled: Boolean(token),
  });

  const pricingQuery = useQuery({
    queryKey: ["billing", "pricing", token],
    queryFn: () => fetchBillingPricing(token!),
    enabled: Boolean(token),
  });

  const quoteQuery = useQuery({
    queryKey: ["billing", "quote", selectedPlan, billingCycle, token],
    queryFn: () => fetchBillingQuote(token!, selectedPlan, billingCycle),
    enabled: Boolean(token),
  });

  const paymentDocsQuery = useQuery({
    queryKey: ["billing", "payment-documents", token],
    queryFn: () => fetchTenantPaymentDocuments(token!),
    enabled: Boolean(token),
  });

  const selectedPlanMeta = useMemo(
    () => pricingQuery.data?.plans.find((p) => p.planCode === selectedPlan),
    [pricingQuery.data, selectedPlan]
  );

  const subscribe = useMutation({
    mutationFn: () => subscribeBilling(token!, selectedPlan, billingCycle),
    onSuccess: async (result) => {
      if (result.mock) {
        toast.success(result.message ?? "Subscription activated (dev mock)");
        void queryClient.invalidateQueries({ queryKey: ["billing"] });
        return;
      }
      if (!result.keyId || !result.orderId) {
        toast.error("Payment could not be started");
        return;
      }
      try {
        await openRazorpayCheckout({
          key: result.keyId,
          order_id: result.orderId,
          amount: result.amount,
          currency: result.currency,
          name: "Vetan HRMS",
          description: `${result.planCode} · ${CYCLE_LABELS[billingCycle]}`,
          prefill: result.prefill,
          onSuccess: async (response) => {
            try {
              await verifyBillingPayment(token!, response);
              toast.success("Payment successful — subscription is active");
              void queryClient.invalidateQueries({ queryKey: ["billing"] });
            } catch (e) {
              toast.error(e instanceof ApiError ? e.message : "Payment verification failed");
            }
          },
          onDismiss: () => toast.message("Payment cancelled"),
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not open Razorpay");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const trialDays = daysUntil(data?.trialEndsAt ?? null);
  const needsPayment = data && !data.hasPaidAccess;
  const quote = quoteQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pay for Vetan SaaS access with Razorpay. Choose a plan and billing tenure — discounts apply
          for longer commitments.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading billing…
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}

      {data ? (
        <GlassCard level={2} header={<h2 className="text-sm font-semibold">Current plan</h2>}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">
                {data.planCode === "TRIAL" || !data.planCode ? "Free trial" : data.planCode}
              </p>
              <p
                className={cn(
                  "mt-1 text-sm",
                  needsPayment ? "text-[var(--warning-text)]" : "text-muted-foreground"
                )}
              >
                {statusLabel(data.status, trialDays)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.employeeCount} active employee{data.employeeCount === 1 ? "" : "s"}
                {data.currentPeriodEnd
                  ? ` · Renews ${new Date(data.currentPeriodEnd).toLocaleDateString("en-IN")}`
                  : null}
              </p>
            </div>
            {data.hasPaidAccess ? (
              <span className="rounded-full bg-[var(--success-bg)] px-3 py-1 text-xs font-medium text-[var(--success-text)]">
                Access enabled
              </span>
            ) : (
              <span className="rounded-full bg-[var(--warning-bg)] px-3 py-1 text-xs font-medium text-[var(--warning-text)]">
                Subscribe to continue
              </span>
            )}
          </div>
          {!data.razorpayConfigured ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Razorpay is not configured on the server — subscribing will activate a mock plan in
              development.
            </p>
          ) : null}
        </GlassCard>
      ) : null}

      <GlassCard level={2} header={<h2 className="text-sm font-semibold">Subscribe</h2>}>
        <div className="grid gap-4 md:grid-cols-2">
          {(pricingQuery.data?.plans ?? []).map((plan) => (
            <button
              key={plan.planCode}
              type="button"
              onClick={() => setSelectedPlan(plan.planCode)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selectedPlan === plan.planCode
                  ? "border-[var(--brand-500)] bg-[color-mix(in_srgb,var(--brand-500)_8%,transparent)]"
                  : "border-border hover:border-[color-mix(in_srgb,var(--brand-500)_35%,transparent)]"
              )}
            >
              <div className="flex items-center gap-2">
                <IndianRupee className="size-4 text-[var(--brand-500)]" />
                <span className="font-semibold">{plan.name}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              <p className="mt-2 font-mono text-sm">
                From {formatCurrency(plan.monthlyBaseInr)}/mo
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <Label>Billing tenure</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"] as BillingCycle[]
            ).map((cycle) => (
              <Button
                key={cycle}
                type="button"
                size="sm"
                variant={billingCycle === cycle ? "default" : "outline"}
                onClick={() => setBillingCycle(cycle)}
              >
                {CYCLE_LABELS[cycle]}
              </Button>
            ))}
          </div>
        </div>

        {quoteQuery.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Calculating price…</p>
        ) : quote ? (
          <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium">{selectedPlanMeta?.name ?? selectedPlan} subscription</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-4 text-muted-foreground">
                <dt>Base ({quote.months} mo × {formatCurrency(quote.monthlyBaseInr)})</dt>
                <dd className="font-mono tabular-nums">{formatCurrency(quote.subtotalInr)}</dd>
              </div>
              {quote.discountPercent > 0 ? (
                <div className="flex justify-between gap-4 text-[var(--success-text)]">
                  <dt>Tenure discount</dt>
                  <dd>−{quote.discountPercent}%</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-border pt-2 font-semibold">
                <dt>Amount due</dt>
                <dd className="font-mono text-lg tabular-nums text-[var(--brand-500)]">
                  {formatCurrency(quote.totalInr)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        <Button
          type="button"
          className="mt-6 w-full max-w-md shadow-[var(--shadow-brand)]"
          disabled={subscribe.isPending || !token || !quote}
          onClick={() => subscribe.mutate()}
        >
          {subscribe.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : data?.razorpayConfigured ? (
            `Pay ${quote ? formatCurrency(quote.totalInr) : ""} with Razorpay`
          ) : (
            `Activate ${quote ? formatCurrency(quote.totalInr) : "plan"} (dev mock)`
          )}
        </Button>
        {user?.email ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Receipt will be sent to {user.email}
          </p>
        ) : null}
      </GlassCard>

      <GlassCard level={2} header={<h2 className="text-sm font-semibold">Payment documents</h2>}>
        <p className="mb-4 text-xs text-muted-foreground">
          PDF receipts for subscription billing and completed payroll runs.
        </p>
        {paymentDocsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : paymentDocsQuery.error ? (
          <p className="text-sm text-destructive">{(paymentDocsQuery.error as Error).message}</p>
        ) : !paymentDocsQuery.data?.length ? (
          <p className="text-sm text-muted-foreground">No payment documents yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
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
                {paymentDocsQuery.data.map((doc: PaymentDocumentItem) => (
                  <PaymentDocumentRow key={`${doc.kind}-${doc.id}`} doc={doc} token={token!} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
