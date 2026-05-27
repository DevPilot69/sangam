import {
  prisma,
  PayrollRunStatus,
  SubscriptionStatus,
} from "@sangam/db";
import { listPaymentDocuments } from "@/server/billing/financial-documents-service";
import { mapTenantListRow } from "./platform-tenants-service";
import { deriveLiveStatus } from "./tenant-utils";

/**
 * Platform-telemetry service — ported from
 * src/modules/platform/platform-telemetry.service.ts (NestJS).
 *
 * Three reads:
 *  - `getSummary()` — top-of-funnel platform metrics + plan breakdown.
 *  - `listTenants(filters)` — paginated tenant directory using the same
 *    `mapTenantListRow` shape the platform Billing & Tenants pages render.
 *  - `getTenant(id)` — single tenant deep dive: counts, invoices, payment
 *    documents, last payroll, admins, legal docs.
 */

function parseWorkspaceSettings(settings: unknown): {
  pan: string | null;
  payDay: number | null;
} {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { pan: null, payDay: null };
  }
  const s = settings as Record<string, unknown>;
  const company =
    s.company && typeof s.company === "object" && !Array.isArray(s.company)
      ? (s.company as Record<string, unknown>)
      : {};
  const payroll =
    s.payroll && typeof s.payroll === "object" && !Array.isArray(s.payroll)
      ? (s.payroll as Record<string, unknown>)
      : {};
  const pan = typeof company.pan === "string" ? company.pan : null;
  const payDay =
    typeof payroll.payDay === "number"
      ? payroll.payDay
      : typeof payroll.payDay === "string"
        ? Number(payroll.payDay)
        : null;
  return {
    pan,
    payDay: payDay != null && !Number.isNaN(payDay) ? payDay : null,
  };
}

export async function getSummary() {
  const [
    tenantCount,
    userCount,
    employeeCount,
    activeSubscriptions,
    trialingSubscriptions,
    payrollRunsDisbursed,
    pendingLeave,
    tenantsLast30,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.employee.count({ where: { deletedAt: null } }),
    prisma.subscription.count({
      where: { status: SubscriptionStatus.ACTIVE },
    }),
    prisma.subscription.count({
      where: { status: SubscriptionStatus.TRIALING },
    }),
    prisma.payrollRun.count({
      where: { status: PayrollRunStatus.DISBURSED },
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.tenant.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const subs = await prisma.subscription.findMany({
    select: { planCode: true, status: true },
  });
  const planBreakdown: Record<string, number> = {};
  for (const s of subs) {
    const key = s.planCode ?? "unknown";
    planBreakdown[key] = (planBreakdown[key] ?? 0) + 1;
  }

  const billingAgg = await prisma.tenantBillingOps.aggregate({
    _sum: { monthlyFeeInr: true, monthlyServerCostInr: true },
    _count: true,
  });
  const overdueCount = await prisma.tenantBillingOps.count({
    where: { paymentStatus: "OVERDUE" },
  });
  const unpaidCount = await prisma.tenantBillingOps.count({
    where: { paymentStatus: "UNPAID" },
  });
  const paidCount = await prisma.tenantBillingOps.count({
    where: { paymentStatus: "PAID" },
  });

  const totalRevenue = Number(billingAgg._sum.monthlyFeeInr ?? 0);
  const totalServerCost = Number(billingAgg._sum.monthlyServerCostInr ?? 0);

  const recentTenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      slug: true,
      name: true,
      createdAt: true,
      subscriptions: { select: { status: true, planCode: true } },
      billingOps: {
        select: {
          paymentStatus: true,
          monthlyFeeInr: true,
          monthlyServerCostInr: true,
        },
      },
      _count: { select: { employees: true, users: true } },
    },
  });

  return {
    tenants: tenantCount,
    users: userCount,
    employees: employeeCount,
    activeSubscriptions,
    trialingSubscriptions,
    payrollRunsDisbursed,
    pendingLeaveRequests: pendingLeave,
    newTenantsLast30Days: tenantsLast30,
    estimatedMrrInr: totalRevenue,
    totalMonthlyServerCostInr: totalServerCost,
    totalMonthlyMarginInr: totalRevenue - totalServerCost,
    paidTenants: paidCount,
    unpaidTenants: unpaidCount,
    overdueTenants: overdueCount,
    planBreakdown,
    recentTenants: recentTenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      createdAt: t.createdAt.toISOString(),
      employeeCount: t._count.employees,
      userCount: t._count.users,
      subscriptionStatus: t.subscriptions[0]?.status ?? null,
      planCode: t.subscriptions[0]?.planCode ?? null,
      paymentStatus: t.billingOps?.paymentStatus ?? null,
      monthlyMarginInr: t.billingOps
        ? Number(t.billingOps.monthlyFeeInr) -
          Number(t.billingOps.monthlyServerCostInr)
        : null,
    })),
  };
}

export async function listTenants(opts?: {
  search?: string;
  limit?: number;
}) {
  const limit = Math.min(opts?.limit ?? 200, 500);
  const search = opts?.search?.trim();

  const tenants = await prisma.tenant.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      companyCode: true,
      name: true,
      industry: true,
      country: true,
      createdAt: true,
      onboardingCompletedAt: true,
      subscriptions: {
        select: { status: true, planCode: true, currentPeriodEnd: true },
      },
      billingOps: {
        select: {
          paymentStatus: true,
          monthlyFeeInr: true,
          monthlyServerCostInr: true,
          lastPaidAt: true,
        },
      },
      _count: {
        select: {
          employees: true,
          users: true,
          payrollRuns: true,
        },
      },
    },
  });

  return tenants.map((t) => mapTenantListRow(t));
}

export async function getTenant(id: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      subscriptions: {
        include: {
          invoices: {
            orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
            take: 6,
          },
        },
      },
      billingOps: true,
      _count: {
        select: {
          employees: true,
          users: true,
          departments: true,
          payrollRuns: true,
          leaveRequests: true,
          auditLogs: true,
        },
      },
    },
  });
  if (!tenant) return null;

  const activeEmployees = await prisma.employee.count({
    where: { tenantId: id, status: "ACTIVE", deletedAt: null },
  });

  const lastPayroll = await prisma.payrollRun.findFirst({
    where: { tenantId: id },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });

  const admins = await prisma.user.findMany({
    where: {
      tenantId: id,
      deletedAt: null,
      roles: {
        some: {
          role: { name: { in: ["ADMIN", "TENANT_ADMIN"] } },
        },
      },
    },
    select: { email: true, name: true, createdAt: true },
    take: 5,
  });

  const liveStatus = deriveLiveStatus({
    onboardingCompletedAt: tenant.onboardingCompletedAt,
    subscriptionStatus: tenant.subscriptions[0]?.status,
  });

  const legalDocuments = await prisma.tenantLegalDocument.findMany({
    where: { tenantId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      documentType: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
  });

  const paymentDocuments = await listPaymentDocuments(id);

  return {
    id: tenant.id,
    slug: tenant.slug,
    companyCode: tenant.companyCode,
    name: tenant.name,
    legalName: tenant.legalName,
    industry: tenant.industry,
    country: tenant.country,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
    onboardingCompletedAt:
      tenant.onboardingCompletedAt?.toISOString() ?? null,
    liveStatus,
    legalDocuments: legalDocuments.map((d) => ({
      id: d.id,
      documentType: d.documentType,
      originalFilename: d.originalFilename,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      createdAt: d.createdAt.toISOString(),
    })),
    settings: tenant.settings,
    workspaceSettings: parseWorkspaceSettings(tenant.settings),
    counts: {
      ...tenant._count,
      activeEmployees,
    },
    subscription: tenant.subscriptions[0]
      ? {
          id: tenant.subscriptions[0].id,
          status: tenant.subscriptions[0].status,
          planCode: tenant.subscriptions[0].planCode,
          trialEndsAt:
            tenant.subscriptions[0].trialEndsAt?.toISOString() ?? null,
          currentPeriodEnd:
            tenant.subscriptions[0].currentPeriodEnd?.toISOString() ?? null,
          razorpayConfigured:
            !!tenant.subscriptions[0].razorpaySubscriptionId,
        }
      : null,
    billing: tenant.billingOps
      ? {
          paymentStatus: tenant.billingOps.paymentStatus,
          monthlyFeeInr: Number(tenant.billingOps.monthlyFeeInr),
          monthlyServerCostInr: Number(tenant.billingOps.monthlyServerCostInr),
          monthlyMarginInr:
            Number(tenant.billingOps.monthlyFeeInr) -
            Number(tenant.billingOps.monthlyServerCostInr),
          lastPaidAt: tenant.billingOps.lastPaidAt?.toISOString() ?? null,
          billingNotes: tenant.billingOps.billingNotes,
        }
      : null,
    invoices: (tenant.subscriptions[0]?.invoices ?? []).map((inv) => ({
      id: inv.id,
      amount: Number(inv.amount),
      currency: inv.currency,
      status: inv.status,
      periodYear: inv.periodYear,
      periodMonth: inv.periodMonth,
      paidAt: inv.paidAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
      pdfUrl: inv.pdfUrl,
      canDownload: true,
    })),
    lastPayroll: lastPayroll
      ? {
          id: lastPayroll.id,
          periodYear: lastPayroll.periodYear,
          periodMonth: lastPayroll.periodMonth,
          status: lastPayroll.status,
        }
      : null,
    tenantAdmins: admins.map((a) => ({
      email: a.email,
      name: a.name,
      since: a.createdAt.toISOString(),
    })),
    paymentDocuments,
  };
}
