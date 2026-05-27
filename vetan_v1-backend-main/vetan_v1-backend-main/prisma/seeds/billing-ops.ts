import {
  PrismaClient,
  SubscriptionStatus,
  TenantPaymentStatus,
} from '@prisma/client';

const PLAN_FEES: Record<string, number> = {
  ENTERPRISE: 14999,
  GROWTH: 4999,
  STARTER: 2999,
};

export function monthlyFeeForPlan(planCode: string | null | undefined): number {
  if (!planCode) return PLAN_FEES.STARTER;
  return PLAN_FEES[planCode] ?? PLAN_FEES.GROWTH;
}

export function estimateServerCostInr(employeeCount: number): number {
  return Math.round(800 + employeeCount * 15);
}

const PAYMENT_CYCLE: TenantPaymentStatus[] = [
  TenantPaymentStatus.PAID,
  TenantPaymentStatus.PAID,
  TenantPaymentStatus.UNPAID,
  TenantPaymentStatus.OVERDUE,
  TenantPaymentStatus.WAIVED,
];

export async function ensureTenantBillingOps(
  prisma: PrismaClient,
  tenantId: string,
  opts: {
    planCode: string | null;
    employeeCount: number;
    seedIndex: number;
  },
): Promise<void> {
  const existing = await prisma.tenantBillingOps.findUnique({
    where: { tenantId },
  });
  if (existing) return;

  const monthlyFeeInr = monthlyFeeForPlan(opts.planCode);
  const monthlyServerCostInr = estimateServerCostInr(opts.employeeCount);
  const paymentStatus = PAYMENT_CYCLE[opts.seedIndex % PAYMENT_CYCLE.length];
  const lastPaidAt =
    paymentStatus === TenantPaymentStatus.PAID ||
    paymentStatus === TenantPaymentStatus.WAIVED
      ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      : null;

  await prisma.tenantBillingOps.create({
    data: {
      tenantId,
      monthlyFeeInr,
      monthlyServerCostInr,
      paymentStatus,
      lastPaidAt,
      billingNotes:
        paymentStatus === TenantPaymentStatus.OVERDUE
          ? 'Follow up with finance contact — invoice overdue 12+ days'
          : null,
    },
  });
}

export async function seedSubscriptionInvoices(
  prisma: PrismaClient,
  subscriptionId: string,
  monthlyFeeInr: number,
  paymentStatus: TenantPaymentStatus,
): Promise<void> {
  const now = new Date();
  for (let m = 0; m < 3; m++) {
    const dt = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const isCurrent = m === 0;
    let status = 'paid';
    let paidAt: Date | null = new Date(dt.getTime() + 5 * 24 * 60 * 60 * 1000);

    if (isCurrent) {
      if (paymentStatus === TenantPaymentStatus.UNPAID) {
        status = 'open';
        paidAt = null;
      } else if (paymentStatus === TenantPaymentStatus.OVERDUE) {
        status = 'overdue';
        paidAt = null;
      } else if (paymentStatus === TenantPaymentStatus.WAIVED) {
        status = 'waived';
        paidAt = null;
      }
    }

    await prisma.invoice.create({
      data: {
        subscriptionId,
        amount: monthlyFeeInr,
        currency: 'INR',
        status,
        periodYear: dt.getFullYear(),
        periodMonth: dt.getMonth() + 1,
        paidAt,
      },
    });
  }
}

export async function backfillBillingForTenant(
  prisma: PrismaClient,
  slug: string,
  seedIndex: number,
): Promise<void> {
  const hadOps = await prisma.tenantBillingOps.findFirst({
    where: { tenant: { slug } },
  });
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      subscriptions: true,
      _count: { select: { employees: true } },
    },
  });
  if (!tenant) return;

  const sub = tenant.subscriptions[0];
  const planCode = sub?.planCode ?? 'GROWTH';

  await ensureTenantBillingOps(prisma, tenant.id, {
    planCode,
    employeeCount: tenant._count.employees,
    seedIndex,
  });

  const ops = await prisma.tenantBillingOps.findUnique({
    where: { tenantId: tenant.id },
  });
  if (!ops || !sub) return;

  const invoiceCount = await prisma.invoice.count({
    where: { subscriptionId: sub.id },
  });
  if (invoiceCount === 0) {
    await seedSubscriptionInvoices(
      prisma,
      sub.id,
      Number(ops.monthlyFeeInr),
      ops.paymentStatus,
    );
  }

  if (!hadOps) {
    // eslint-disable-next-line no-console
    console.log(`  + billing monitor data for ${slug}`);
  }
}
