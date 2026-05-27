import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import {
  prisma,
  Prisma,
  SubscriptionStatus,
  TenantPaymentStatus,
} from "@sangam/db";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@sangam/api-kit";
import type { Platform } from "@sangam/contracts";
import {
  deriveLiveStatus,
  estimateServerCostInr,
  monthlyFeeForPlan,
  slugifyWorkspace,
  type TenantLiveStatus,
} from "./tenant-utils";
import {
  normalizeCompanyCode,
  suggestCompanyCodeFromName,
} from "@/server/shared/company-code";
import { resolveUniqueCompanyCode } from "@/server/auth/employee-credentials-service";
import { buildInvoiceDownloadPayload } from "@/server/billing/billing-service";

/**
 * Platform-tenants service — ported from
 * src/modules/platform/platform-tenants.service.ts (NestJS).
 *
 * Owns three operations:
 *  - `provision` — atomic tenant onboarding (tenant + subscription +
 *    billing ops + ADMIN role + admin user + seed department + seed
 *    designation, all in one Prisma `$transaction`).
 *  - `updateOperationalStatus` — transitions the (subscription × onboarding)
 *    state to a target LIVE/TRIAL/SETUP/PAST_DUE/CHURNED value.
 *  - `isSlugAvailable` / `updateCompanyCode` / `getInvoiceDownload` —
 *    thin proxies.
 *
 * `mapTenantListRow` is exported so the telemetry service can use the
 * same row-projection (Nest version put it on the same provider for the
 * same reason).
 */

const BCRYPT_ROUNDS = 12;

function trialDaysFromEnv(): number {
  const env = process.env.BILLING_TRIAL_DAYS;
  const parsed = env ? Number(env) : 14;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 14;
}

function frontendUrl(): string {
  return process.env.FRONTEND_URL ?? "";
}

function departmentCodeFromName(name: string): string {
  let c = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 24);
  if (!c) c = "MAIN";
  return c;
}

export async function isSlugAvailable(
  slug: string,
): Promise<{ slug: string; available: boolean }> {
  const normalized = slugifyWorkspace(slug);
  const row = await prisma.tenant.findUnique({
    where: { slug: normalized },
    select: { id: true },
  });
  return { slug: normalized, available: !row };
}

export async function provision(dto: Platform.ProvisionTenantDto) {
  const permissions = await prisma.permission.findMany();
  if (permissions.length === 0) {
    throw new BadRequestError(
      "Permissions not seeded — run npx prisma db seed",
    );
  }

  let slug = dto.slug ? slugifyWorkspace(dto.slug) : slugifyWorkspace(dto.name);
  const slugTaken = await prisma.tenant.findUnique({ where: { slug } });
  if (slugTaken) {
    if (dto.slug) {
      throw new ConflictError(`Workspace slug "${slug}" is already taken`);
    }
    slug = `${slug}-${randomInt(1000, 9999)}`;
  }

  const emailNorm = dto.adminEmail.toLowerCase();
  const planCode = dto.planCode ?? "STARTER";
  const subscriptionStatus =
    dto.subscriptionStatus ?? SubscriptionStatus.TRIALING;
  const trialDays = dto.trialDays ?? trialDaysFromEnv();
  const monthlyFeeInr = dto.monthlyFeeInr ?? monthlyFeeForPlan(planCode);
  const monthlyServerCostInr =
    dto.monthlyServerCostInr ?? estimateServerCostInr(0);
  const paymentStatus = dto.paymentStatus ?? TenantPaymentStatus.UNPAID;
  const verifyEmail = dto.verifyAdminEmail !== false;
  const passwordHash = await bcrypt.hash(dto.adminPassword, BCRYPT_ROUNDS);

  const legalName = dto.legalName?.trim() || dto.name.trim();
  const industry = dto.industry?.trim() || "General";
  const country = dto.country?.trim() || "IN";
  const settings = (dto.settings ?? {}) as Prisma.InputJsonValue;

  const deptName = dto.departmentName?.trim() || "General";
  const deptCode =
    dto.departmentCode?.trim().toUpperCase() ||
    departmentCodeFromName(deptName);
  const desTitle = dto.designationTitle?.trim() || "Primary";

  const markComplete = dto.markOnboardingComplete !== false;

  const companyCode = await resolveUniqueCompanyCode(
    dto.companyCode
      ? normalizeCompanyCode(dto.companyCode)
      : suggestCompanyCodeFromName(dto.name),
  );

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        slug,
        companyCode,
        name: dto.name.trim(),
        legalName,
        industry,
        country,
        settings,
        ...(markComplete && {
          onboardingCompletedAt: new Date(),
        }),
      },
    });

    const trialEndsAt =
      subscriptionStatus === SubscriptionStatus.TRIALING
        ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
        : null;

    await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        status: subscriptionStatus,
        planCode,
        trialEndsAt,
        currentPeriodEnd:
          subscriptionStatus === SubscriptionStatus.ACTIVE
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : null,
      },
    });

    await tx.tenantBillingOps.create({
      data: {
        tenantId: tenant.id,
        monthlyFeeInr,
        monthlyServerCostInr,
        paymentStatus,
        billingNotes: dto.billingNotes?.trim() || null,
        lastPaidAt:
          paymentStatus === TenantPaymentStatus.PAID ||
          paymentStatus === TenantPaymentStatus.WAIVED
            ? new Date()
            : null,
      },
    });

    const role = await tx.role.create({
      data: {
        tenantId: tenant.id,
        name: "ADMIN",
        description: "Full workspace administrator",
        permissions: {
          create: permissions.map((p) => ({ permissionId: p.id })),
        },
      },
    });

    const adminUser = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: emailNorm,
        name: dto.adminName.trim(),
        passwordHash,
        emailVerifiedAt: verifyEmail ? null : new Date(),
        roles: { create: [{ roleId: role.id }] },
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    const department = await tx.department.create({
      data: {
        tenantId: tenant.id,
        name: deptName,
        code: deptCode,
      },
    });

    await tx.designation.create({
      data: {
        tenantId: tenant.id,
        title: desTitle,
        departmentId: department.id,
      },
    });

    return { tenant, adminUser };
  });

  const liveStatus = deriveLiveStatus({
    onboardingCompletedAt: result.tenant.onboardingCompletedAt,
    subscriptionStatus: subscriptionStatus,
  });

  return {
    id: result.tenant.id,
    slug: result.tenant.slug,
    companyCode,
    name: result.tenant.name,
    legalName: result.tenant.legalName,
    industry: result.tenant.industry,
    country: result.tenant.country,
    createdAt: result.tenant.createdAt.toISOString(),
    onboardingCompletedAt:
      result.tenant.onboardingCompletedAt?.toISOString() ?? null,
    liveStatus,
    admin: {
      id: result.adminUser.id,
      email: result.adminUser.email,
      name: result.adminUser.name,
      emailVerified: !!result.adminUser.emailVerifiedAt,
    },
    loginUrl: `${frontendUrl()}/login?tenant=${result.tenant.slug}`,
    message:
      "Tenant provisioned. Share workspace slug and admin credentials with the customer.",
  };
}

export async function updateCompanyCode(
  tenantId: string,
  companyCodeRaw: string,
) {
  const code = await resolveUniqueCompanyCode(
    normalizeCompanyCode(companyCodeRaw),
    tenantId,
  );
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { companyCode: code },
    select: { id: true, companyCode: true },
  });
}

type RowForList = {
  id: string;
  slug: string;
  companyCode: string | null;
  name: string;
  industry: string | null;
  country: string;
  createdAt: Date;
  onboardingCompletedAt: Date | null;
  subscriptions: {
    status: SubscriptionStatus;
    planCode: string | null;
    currentPeriodEnd: Date | null;
  }[];
  billingOps: {
    paymentStatus: TenantPaymentStatus;
    monthlyFeeInr: Prisma.Decimal;
    monthlyServerCostInr: Prisma.Decimal;
    lastPaidAt: Date | null;
  } | null;
  _count: { employees: number; users: number; payrollRuns: number };
};

export function mapTenantListRow(t: RowForList) {
  const sub = t.subscriptions[0];
  const liveStatus = deriveLiveStatus({
    onboardingCompletedAt: t.onboardingCompletedAt,
    subscriptionStatus: sub?.status,
  });
  const monthlyFee = t.billingOps ? Number(t.billingOps.monthlyFeeInr) : null;
  const monthlyCost = t.billingOps
    ? Number(t.billingOps.monthlyServerCostInr)
    : null;

  return {
    id: t.id,
    slug: t.slug,
    companyCode: t.companyCode,
    name: t.name,
    industry: t.industry,
    country: t.country,
    createdAt: t.createdAt.toISOString(),
    onboardedAt: t.onboardingCompletedAt?.toISOString() ?? null,
    onboardingComplete: !!t.onboardingCompletedAt,
    liveStatus,
    employeeCount: t._count.employees,
    userCount: t._count.users,
    payrollRunCount: t._count.payrollRuns,
    subscription: sub
      ? {
          status: sub.status,
          planCode: sub.planCode,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
        }
      : null,
    billing: t.billingOps
      ? {
          paymentStatus: t.billingOps.paymentStatus,
          monthlyFeeInr: monthlyFee!,
          monthlyServerCostInr: monthlyCost!,
          monthlyMarginInr: monthlyFee! - monthlyCost!,
          lastPaidAt: t.billingOps.lastPaidAt?.toISOString() ?? null,
        }
      : null,
  };
}

export async function updateOperationalStatus(
  tenantId: string,
  target: TenantLiveStatus,
): Promise<{ liveStatus: TenantLiveStatus; subscriptionStatus: string }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { subscriptions: true },
  });
  if (!tenant) throw new NotFoundError("Tenant not found");

  let subscriptionStatus: SubscriptionStatus;
  let onboardingCompletedAt: Date | null;

  switch (target) {
    case "SETUP":
      subscriptionStatus = SubscriptionStatus.TRIALING;
      onboardingCompletedAt = null;
      break;
    case "TRIAL":
      subscriptionStatus = SubscriptionStatus.TRIALING;
      onboardingCompletedAt = tenant.onboardingCompletedAt ?? new Date();
      break;
    case "LIVE":
      subscriptionStatus = SubscriptionStatus.ACTIVE;
      onboardingCompletedAt = tenant.onboardingCompletedAt ?? new Date();
      break;
    case "PAST_DUE":
      subscriptionStatus = SubscriptionStatus.PAST_DUE;
      onboardingCompletedAt = tenant.onboardingCompletedAt ?? new Date();
      break;
    case "CHURNED":
      subscriptionStatus = SubscriptionStatus.CANCELLED;
      onboardingCompletedAt = tenant.onboardingCompletedAt ?? new Date();
      break;
    default:
      throw new BadRequestError("Invalid operational status");
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { onboardingCompletedAt },
    });
    const sub = tenant.subscriptions[0];
    if (sub) {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: subscriptionStatus },
      });
    } else {
      await tx.subscription.create({
        data: {
          tenantId,
          status: subscriptionStatus,
          planCode: "GROWTH",
        },
      });
    }
  });

  const liveStatus = deriveLiveStatus({
    onboardingCompletedAt,
    subscriptionStatus,
  });

  return { liveStatus, subscriptionStatus };
}

export async function getInvoiceDownload(
  tenantId: string,
  invoiceId: string,
) {
  return buildInvoiceDownloadPayload(tenantId, invoiceId);
}
