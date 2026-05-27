import { Injectable, NotFoundException } from '@nestjs/common';
import { PayrollRunStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  renderPayrollPaymentPdf,
  renderSubscriptionInvoicePdf,
} from '../../shared/documents/financial-invoice-pdf';

const PAYROLL_INVOICE_STATUSES: PayrollRunStatus[] = [
  PayrollRunStatus.APPROVED,
  PayrollRunStatus.LOCKED,
  PayrollRunStatus.DISBURSED,
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function periodLabelSub(year: number | null, month: number | null): string {
  if (year == null || month == null) return '—';
  return `${String(month).padStart(2, '0')}/${year}`;
}

function periodLabelPayroll(year: number, month: number): string {
  return `${SHORT_MONTHS[month - 1] ?? month} ${year}`;
}

export type PaymentDocumentListItem =
  | {
      kind: 'SUBSCRIPTION';
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
      kind: 'PAYROLL';
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

@Injectable()
export class FinancialDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPaymentDocuments(tenantId: string): Promise<PaymentDocumentListItem[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      select: { id: true },
    });

    const subscriptionDocs: PaymentDocumentListItem[] = [];
    if (sub) {
      const invoices = await this.prisma.invoice.findMany({
        where: { subscriptionId: sub.id },
        orderBy: [{ createdAt: 'desc' }],
      });
      for (const inv of invoices) {
        const pl = periodLabelSub(inv.periodYear, inv.periodMonth);
        subscriptionDocs.push({
          kind: 'SUBSCRIPTION',
          id: inv.id,
          title: 'Vetan subscription',
          periodLabel: pl,
          amountInr: Number(inv.amount),
          currency: inv.currency,
          status: inv.status,
          createdAt: inv.createdAt.toISOString(),
          paidAt: inv.paidAt?.toISOString() ?? null,
          pdfFilename: `vetan-subscription-${tenant.slug}-${pl.replace('/', '-')}.pdf`,
        });
      }
    }

    const payrollRuns = await this.prisma.payrollRun.findMany({
      where: { tenantId, status: { in: PAYROLL_INVOICE_STATUSES } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      include: {
        entries: {
          select: { gross: true, deductions: true, net: true },
        },
      },
    });

    const payrollDocs: PaymentDocumentListItem[] = payrollRuns.map((run) => {
      const gross = run.entries.reduce((s, e) => s + Number(e.gross), 0);
      const deductions = run.entries.reduce((s, e) => s + Number(e.deductions), 0);
      const net = run.entries.reduce((s, e) => s + Number(e.net), 0);
      const pl = periodLabelPayroll(run.periodYear, run.periodMonth);
      return {
        kind: 'PAYROLL',
        id: run.id,
        title: 'Payroll disbursement',
        periodLabel: pl,
        amountInr: net,
        currency: 'INR',
        status: run.status,
        createdAt: run.updatedAt.toISOString(),
        employeeCount: run.entries.length,
        grossInr: gross,
        deductionsInr: deductions,
        pdfFilename: `vetan-payroll-${tenant.slug}-${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}.pdf`,
      };
    });

    const merged = [...subscriptionDocs, ...payrollDocs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return merged;
  }

  async buildSubscriptionPdfBuffer(
    tenantId: string,
    invoiceId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        subscription: { tenantId },
      },
      include: {
        subscription: {
          include: { tenant: { select: { name: true, slug: true } } },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const t = invoice.subscription.tenant;
    const periodLabel =
      invoice.periodYear && invoice.periodMonth
        ? `${String(invoice.periodMonth).padStart(2, '0')}/${invoice.periodYear}`
        : '—';

    const buffer = await renderSubscriptionInvoicePdf({
      tenantName: t.name,
      tenantSlug: t.slug,
      invoiceId: invoice.id,
      periodLabel,
      amountInr: Number(invoice.amount),
      currency: invoice.currency,
      status: invoice.status,
      paidAt: invoice.paidAt?.toISOString().slice(0, 10) ?? null,
    });

    const filename = `vetan-subscription-${t.slug}-${periodLabel.replace('/', '-')}.pdf`;
    return { buffer, filename };
  }

  async buildPayrollPdfBuffer(
    tenantId: string,
    payrollRunId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const run = await this.prisma.payrollRun.findFirst({
      where: {
        id: payrollRunId,
        tenantId,
        status: { in: PAYROLL_INVOICE_STATUSES },
      },
      include: {
        tenant: { select: { name: true, slug: true } },
        entries: {
          include: {
            employee: {
              select: { employeeCode: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
    if (!run) {
      throw new NotFoundException(
        'Payroll run not found or not invoice-eligible (approved, locked, or disbursed)',
      );
    }

    const gross = run.entries.reduce((s, e) => s + Number(e.gross), 0);
    const deductions = run.entries.reduce((s, e) => s + Number(e.deductions), 0);
    const net = run.entries.reduce((s, e) => s + Number(e.net), 0);

    const lines = run.entries.map((e) => ({
      code: e.employee.employeeCode,
      name: `${e.employee.firstName} ${e.employee.lastName}`.trim(),
      gross: Number(e.gross),
      deductions: Number(e.deductions),
      net: Number(e.net),
    }));

    const periodLabel = periodLabelPayroll(run.periodYear, run.periodMonth);
    const buffer = await renderPayrollPaymentPdf({
      tenantName: run.tenant.name,
      tenantSlug: run.tenant.slug,
      payrollRunId: run.id,
      periodLabel,
      status: run.status,
      employeeCount: run.entries.length,
      grossInr: gross,
      deductionsInr: deductions,
      netInr: net,
      lines,
    });

    const filename = `vetan-payroll-${run.tenant.slug}-${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}.pdf`;
    return { buffer, filename };
  }
}
