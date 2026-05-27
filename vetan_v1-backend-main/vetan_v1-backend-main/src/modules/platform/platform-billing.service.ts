import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPaymentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

function num(d: { toString(): string } | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === 'number' ? d : Number(d);
}

function mapTenantBillingRow(
  tenant: {
    id: string;
    slug: string;
    name: string;
    createdAt: Date;
    subscriptions: {
      status: string;
      planCode: string | null;
      currentPeriodEnd: Date | null;
      invoices: {
        id: string;
        amount: { toString(): string };
        status: string;
        periodYear: number | null;
        periodMonth: number | null;
        paidAt: Date | null;
        createdAt: Date;
      }[];
    }[];
    billingOps: {
      monthlyFeeInr: { toString(): string };
      monthlyServerCostInr: { toString(): string };
      paymentStatus: TenantPaymentStatus;
      lastPaidAt: Date | null;
      billingNotes: string | null;
      updatedAt: Date;
    } | null;
    _count: { employees: number };
  },
) {
  const sub = tenant.subscriptions[0];
  const ops = tenant.billingOps;
  const fee = num(ops?.monthlyFeeInr);
  const cost = num(ops?.monthlyServerCostInr);
  const margin = fee - cost;

  const currentInvoice = sub?.invoices.find(
    (i) =>
      i.periodYear === new Date().getFullYear() &&
      i.periodMonth === new Date().getMonth() + 1,
  );

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    employeeCount: tenant._count.employees,
    subscriptionStatus: sub?.status ?? null,
    planCode: sub?.planCode ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    monthlyFeeInr: fee,
    monthlyServerCostInr: cost,
    monthlyMarginInr: margin,
    marginPercent: fee > 0 ? Math.round((margin / fee) * 1000) / 10 : 0,
    paymentStatus: ops?.paymentStatus ?? TenantPaymentStatus.UNPAID,
    lastPaidAt: ops?.lastPaidAt?.toISOString() ?? null,
    billingNotes: ops?.billingNotes ?? null,
    billingOpsUpdatedAt: ops?.updatedAt.toISOString() ?? null,
    currentInvoice: currentInvoice
      ? {
          id: currentInvoice.id,
          amount: num(currentInvoice.amount),
          status: currentInvoice.status,
          paidAt: currentInvoice.paidAt?.toISOString() ?? null,
        }
      : null,
    isPaidThisCycle:
      ops?.paymentStatus === TenantPaymentStatus.PAID ||
      ops?.paymentStatus === TenantPaymentStatus.WAIVED,
  };
}

@Injectable()
export class PlatformBillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const rows = await this.prisma.tenantBillingOps.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            createdAt: true,
            subscriptions: {
              take: 1,
              include: {
                invoices: {
                  orderBy: { createdAt: 'desc' },
                  take: 3,
                },
              },
            },
            _count: { select: { employees: true } },
          },
        },
      },
    });

    const tenants = rows.map((r) =>
      mapTenantBillingRow({
        ...r.tenant,
        billingOps: {
          monthlyFeeInr: r.monthlyFeeInr,
          monthlyServerCostInr: r.monthlyServerCostInr,
          paymentStatus: r.paymentStatus,
          lastPaidAt: r.lastPaidAt,
          billingNotes: r.billingNotes,
          updatedAt: r.updatedAt,
        },
      }),
    );

    let totalRevenue = 0;
    let totalServerCost = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let overdueCount = 0;

    for (const t of tenants) {
      totalRevenue += t.monthlyFeeInr;
      totalServerCost += t.monthlyServerCostInr;
      if (t.paymentStatus === TenantPaymentStatus.PAID) paidCount++;
      else if (t.paymentStatus === TenantPaymentStatus.OVERDUE) overdueCount++;
      else if (
        t.paymentStatus === TenantPaymentStatus.UNPAID
      )
        unpaidCount++;
    }

    return {
      tenantCount: tenants.length,
      totalMonthlyRevenueInr: totalRevenue,
      totalMonthlyServerCostInr: totalServerCost,
      totalMonthlyMarginInr: totalRevenue - totalServerCost,
      paidTenants: paidCount,
      unpaidTenants: unpaidCount,
      overdueTenants: overdueCount,
      waivedTenants: tenants.filter(
        (t) => t.paymentStatus === TenantPaymentStatus.WAIVED,
      ).length,
    };
  }

  async listTenants(opts?: {
    search?: string;
    paymentStatus?: TenantPaymentStatus;
  }) {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        ...(opts?.paymentStatus && {
          billingOps: { paymentStatus: opts.paymentStatus },
        }),
        ...(opts?.search?.trim() && {
          OR: [
            { name: { contains: opts.search.trim(), mode: 'insensitive' } },
            { slug: { contains: opts.search.trim(), mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
      include: {
        subscriptions: {
          take: 1,
          include: {
            invoices: {
              orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
              take: 6,
            },
          },
        },
        billingOps: true,
        _count: { select: { employees: true } },
      },
    });

    return tenants
      .map((t) => mapTenantBillingRow(t))
      .sort((a, b) => {
        const order = { OVERDUE: 0, UNPAID: 1, PAID: 2, WAIVED: 3 };
        return (
          (order[a.paymentStatus as keyof typeof order] ?? 9) -
          (order[b.paymentStatus as keyof typeof order] ?? 9)
        );
      });
  }

  async getTenantBilling(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          include: {
            invoices: {
              orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
              take: 12,
            },
          },
        },
        billingOps: true,
        _count: { select: { employees: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const summary = mapTenantBillingRow(tenant);
    const sub = tenant.subscriptions[0];

    return {
      ...summary,
      invoices: (sub?.invoices ?? []).map((inv) => ({
        id: inv.id,
        amount: num(inv.amount),
        status: inv.status,
        periodYear: inv.periodYear,
        periodMonth: inv.periodMonth,
        periodLabel:
          inv.periodYear && inv.periodMonth
            ? `${inv.periodMonth}/${inv.periodYear}`
            : null,
        paidAt: inv.paidAt?.toISOString() ?? null,
        createdAt: inv.createdAt.toISOString(),
      })),
    };
  }

  async updateTenantBilling(
    tenantId: string,
    body: {
      monthlyFeeInr?: number;
      monthlyServerCostInr?: number;
      paymentStatus?: TenantPaymentStatus;
      lastPaidAt?: string | null;
      billingNotes?: string | null;
    },
  ) {
    const existing = await this.prisma.tenantBillingOps.findUnique({
      where: { tenantId },
    });
    if (!existing) throw new NotFoundException('Billing ops not found for tenant');

    let lastPaidAt: Date | null | undefined;
    if (body.lastPaidAt !== undefined) {
      lastPaidAt =
        body.lastPaidAt === null ? null : new Date(body.lastPaidAt);
    } else if (
      body.paymentStatus === TenantPaymentStatus.PAID &&
      !existing.lastPaidAt
    ) {
      lastPaidAt = new Date();
    }

    await this.prisma.tenantBillingOps.update({
      where: { tenantId },
      data: {
        ...(body.monthlyFeeInr !== undefined && {
          monthlyFeeInr: body.monthlyFeeInr,
        }),
        ...(body.monthlyServerCostInr !== undefined && {
          monthlyServerCostInr: body.monthlyServerCostInr,
        }),
        ...(body.paymentStatus !== undefined && {
          paymentStatus: body.paymentStatus,
        }),
        ...(body.billingNotes !== undefined && {
          billingNotes: body.billingNotes,
        }),
        ...(lastPaidAt !== undefined && { lastPaidAt }),
      },
    });

    if (body.paymentStatus === TenantPaymentStatus.PAID) {
      const sub = await this.prisma.subscription.findUnique({
        where: { tenantId },
      });
      if (sub) {
        const now = new Date();
        await this.prisma.invoice.updateMany({
          where: {
            subscriptionId: sub.id,
            periodYear: now.getFullYear(),
            periodMonth: now.getMonth() + 1,
          },
          data: { status: 'paid', paidAt: new Date() },
        });
      }
    }

    return this.getTenantBilling(tenantId);
  }
}
