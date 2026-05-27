import { prisma, PayrollRunStatus } from "@sangam/db";
import { NotFoundError } from "@sangam/api-kit";

/**
 * Financial documents service — ported from
 * src/modules/billing/financial-documents.service.ts (NestJS).
 *
 * Two surfaces:
 *  - `listPaymentDocuments(tenantId)` — merged list of subscription invoices
 *    and payroll disbursements that have a downloadable PDF.
 *  - `resolveSubscriptionPdf(tenantId, invoiceId)` /
 *    `resolvePayrollPdf(tenantId, payrollRunId)` — return `{ url, filename }`
 *    pairs. In demo mode the URL points at `/samples/sample-payslip.pdf` (for
 *    payroll) or `/samples/sample-invoice.pdf` (for subscription); Phase 6
 *    swaps these for a real PDF render.
 *
 * The original Nest service generated PDFs synchronously with `pdfkit`. We
 * avoid that on Vercel for two reasons:
 *  - pdfkit ships native font binaries which inflate cold-start
 *  - generating a payroll PDF for hundreds of employees blows the 60s budget
 *
 * Demo URLs are static samples; the response shape matches what the
 * front-end's `lib/api/billing.ts` expects so the existing UI keeps working.
 */

const PAYROLL_INVOICE_STATUSES: PayrollRunStatus[] = [
  PayrollRunStatus.APPROVED,
  PayrollRunStatus.LOCKED,
  PayrollRunStatus.DISBURSED,
];

const SHORT_MONTHS = [
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

function periodLabelSub(year: number | null, month: number | null): string {
  if (year == null || month == null) return "—";
  return `${String(month).padStart(2, "0")}/${year}`;
}

function periodLabelPayroll(year: number, month: number): string {
  return `${SHORT_MONTHS[month - 1] ?? month} ${year}`;
}

export type PaymentDocumentListItem =
  | {
      kind: "SUBSCRIPTION";
      id: string;
      title: string;
      periodLabel: string;
      amountInr: number;
      currency: string;
      status: string;
      createdAt: string;
      paidAt: string | null;
      pdfFilename: string;
    }
  | {
      kind: "PAYROLL";
      id: string;
      title: string;
      periodLabel: string;
      amountInr: number;
      currency: string;
      status: string;
      createdAt: string;
      employeeCount: number;
      grossInr: number;
      deductionsInr: number;
      pdfFilename: string;
    };

export async function listPaymentDocuments(
  tenantId: string,
): Promise<PaymentDocumentListItem[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  if (!tenant) throw new NotFoundError("Tenant not found");

  const sub = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { id: true },
  });

  const subscriptionDocs: PaymentDocumentListItem[] = [];
  if (sub) {
    const invoices = await prisma.invoice.findMany({
      where: { subscriptionId: sub.id },
      orderBy: [{ createdAt: "desc" }],
    });
    for (const inv of invoices) {
      const pl = periodLabelSub(inv.periodYear, inv.periodMonth);
      subscriptionDocs.push({
        kind: "SUBSCRIPTION",
        id: inv.id,
        title: "Vetan subscription",
        periodLabel: pl,
        amountInr: Number(inv.amount),
        currency: inv.currency,
        status: inv.status,
        createdAt: inv.createdAt.toISOString(),
        paidAt: inv.paidAt?.toISOString() ?? null,
        pdfFilename: `vetan-subscription-${tenant.slug}-${pl.replace("/", "-")}.pdf`,
      });
    }
  }

  const payrollRuns = await prisma.payrollRun.findMany({
    where: { tenantId, status: { in: PAYROLL_INVOICE_STATUSES } },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    include: {
      entries: {
        select: { gross: true, deductions: true, net: true },
      },
    },
  });

  const payrollDocs: PaymentDocumentListItem[] = payrollRuns.map((run) => {
    const gross = run.entries.reduce((s, e) => s + Number(e.gross), 0);
    const deductions = run.entries.reduce(
      (s, e) => s + Number(e.deductions),
      0,
    );
    const net = run.entries.reduce((s, e) => s + Number(e.net), 0);
    const pl = periodLabelPayroll(run.periodYear, run.periodMonth);
    return {
      kind: "PAYROLL",
      id: run.id,
      title: "Payroll disbursement",
      periodLabel: pl,
      amountInr: net,
      currency: "INR",
      status: run.status,
      createdAt: run.updatedAt.toISOString(),
      employeeCount: run.entries.length,
      grossInr: gross,
      deductionsInr: deductions,
      pdfFilename: `vetan-payroll-${tenant.slug}-${run.periodYear}-${String(run.periodMonth).padStart(2, "0")}.pdf`,
    };
  });

  return [...subscriptionDocs, ...payrollDocs].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function resolveSubscriptionPdf(
  tenantId: string,
  invoiceId: string,
): Promise<{ url: string; filename: string }> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, subscription: { tenantId } },
    include: {
      subscription: {
        include: { tenant: { select: { slug: true } } },
      },
    },
  });
  if (!invoice) throw new NotFoundError("Invoice not found");

  const pl =
    invoice.periodYear && invoice.periodMonth
      ? `${String(invoice.periodMonth).padStart(2, "0")}/${invoice.periodYear}`
      : "—";
  const filename = `vetan-subscription-${invoice.subscription.tenant.slug}-${pl.replace(
    "/",
    "-",
  )}.pdf`;
  return { url: "/samples/sample-invoice.pdf", filename };
}

export async function resolvePayrollPdf(
  tenantId: string,
  payrollRunId: string,
): Promise<{ url: string; filename: string }> {
  const run = await prisma.payrollRun.findFirst({
    where: {
      id: payrollRunId,
      tenantId,
      status: { in: PAYROLL_INVOICE_STATUSES },
    },
    include: { tenant: { select: { slug: true } } },
  });
  if (!run) {
    throw new NotFoundError(
      "Payroll run not found or not invoice-eligible (approved, locked, or disbursed)",
    );
  }
  const filename = `vetan-payroll-${run.tenant.slug}-${run.periodYear}-${String(run.periodMonth).padStart(2, "0")}.pdf`;
  return { url: "/samples/sample-payslip.pdf", filename };
}
