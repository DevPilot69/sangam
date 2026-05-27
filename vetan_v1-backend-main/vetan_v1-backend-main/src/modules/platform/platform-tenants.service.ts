import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  SubscriptionStatus,
  TenantPaymentStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import type { EnvVars } from '../../config/validate-env';
import { PrismaService } from '../../database/prisma.service';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';
import {
  deriveLiveStatus,
  estimateServerCostInr,
  monthlyFeeForPlan,
  slugifyWorkspace,
  type TenantLiveStatus,
} from './platform-tenant.utils';
import { EmployeeCredentialsService } from '../auth/employee-credentials.service';
import { BillingService } from '../billing/billing.service';
import {
  normalizeCompanyCode,
  suggestCompanyCodeFromName,
} from '../../shared/company-code';

const BCRYPT_ROUNDS = 12;

function departmentCodeFromName(name: string): string {
  let c = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 24);
  if (!c) c = 'MAIN';
  return c;
}

@Injectable()
export class PlatformTenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvVars, true>,
    private readonly credentials: EmployeeCredentialsService,
    private readonly billing: BillingService,
  ) {}

  async isSlugAvailable(slug: string): Promise<{ slug: string; available: boolean }> {
    const normalized = slugifyWorkspace(slug);
    const row = await this.prisma.tenant.findUnique({
      where: { slug: normalized },
      select: { id: true },
    });
    return { slug: normalized, available: !row };
  }

  async provision(dto: ProvisionTenantDto) {
    const permissions = await this.prisma.permission.findMany();
    if (permissions.length === 0) {
      throw new BadRequestException(
        'Permissions not seeded — run npx prisma db seed',
      );
    }

    let slug = dto.slug ? slugifyWorkspace(dto.slug) : slugifyWorkspace(dto.name);
    const slugTaken = await this.prisma.tenant.findUnique({ where: { slug } });
    if (slugTaken) {
      if (dto.slug) {
        throw new ConflictException(`Workspace slug "${slug}" is already taken`);
      }
      slug = `${slug}-${randomInt(1000, 9999)}`;
    }

    const emailNorm = dto.adminEmail.toLowerCase();
    const planCode = dto.planCode ?? 'STARTER';
    const subscriptionStatus =
      dto.subscriptionStatus ?? SubscriptionStatus.TRIALING;
    const trialDays: number =
      dto.trialDays ??
      this.config.get('BILLING_TRIAL_DAYS', { infer: true }) ??
      14;
    const monthlyFeeInr =
      dto.monthlyFeeInr ?? monthlyFeeForPlan(planCode);
    const monthlyServerCostInr =
      dto.monthlyServerCostInr ?? estimateServerCostInr(0);
    const paymentStatus = dto.paymentStatus ?? TenantPaymentStatus.UNPAID;
    const verifyEmail = dto.verifyAdminEmail !== false;
    const passwordHash = await bcrypt.hash(dto.adminPassword, BCRYPT_ROUNDS);

    const legalName = dto.legalName?.trim() || dto.name.trim();
    const industry = dto.industry?.trim() || 'General';
    const country = dto.country?.trim() || 'IN';
    const settings = (dto.settings ?? {}) as Prisma.InputJsonValue;

    const deptName = dto.departmentName?.trim() || 'General';
    const deptCode =
      dto.departmentCode?.trim().toUpperCase() ||
      departmentCodeFromName(deptName);
    const desTitle = dto.designationTitle?.trim() || 'Primary';

    const markComplete = dto.markOnboardingComplete !== false;

    const companyCode = await this.credentials.resolveUniqueCompanyCode(
      dto.companyCode
        ? normalizeCompanyCode(dto.companyCode)
        : suggestCompanyCodeFromName(dto.name),
    );

    const result = await this.prisma.$transaction(async (tx) => {
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
          name: 'ADMIN',
          description: 'Full workspace administrator',
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
      subscriptionStatus:
        dto.subscriptionStatus ?? SubscriptionStatus.TRIALING,
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
      loginUrl: `${this.config.get('FRONTEND_URL', { infer: true })}/login?tenant=${result.tenant.slug}`,
      message:
        'Tenant provisioned. Share workspace slug and admin credentials with the customer.',
    };
  }

  async updateCompanyCode(tenantId: string, companyCodeRaw: string) {
    const code = await this.credentials.resolveUniqueCompanyCode(
      normalizeCompanyCode(companyCodeRaw),
      tenantId,
    );
    const row = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { companyCode: code },
      select: { id: true, companyCode: true },
    });
    return row;
  }

  mapTenantListRow(t: {
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
    _count: {
      employees: number;
      users: number;
      payrollRuns: number;
    };
  }) {
    const sub = t.subscriptions[0];
    const liveStatus = deriveLiveStatus({
      onboardingCompletedAt: t.onboardingCompletedAt,
      subscriptionStatus: sub?.status,
    });
    const monthlyFee = t.billingOps
      ? Number(t.billingOps.monthlyFeeInr)
      : null;
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

  async updateOperationalStatus(
    tenantId: string,
    target: TenantLiveStatus,
  ): Promise<{ liveStatus: TenantLiveStatus; subscriptionStatus: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscriptions: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    let subscriptionStatus: SubscriptionStatus;
    let onboardingCompletedAt: Date | null;

    switch (target) {
      case 'SETUP':
        subscriptionStatus = SubscriptionStatus.TRIALING;
        onboardingCompletedAt = null;
        break;
      case 'TRIAL':
        subscriptionStatus = SubscriptionStatus.TRIALING;
        onboardingCompletedAt = tenant.onboardingCompletedAt ?? new Date();
        break;
      case 'LIVE':
        subscriptionStatus = SubscriptionStatus.ACTIVE;
        onboardingCompletedAt = tenant.onboardingCompletedAt ?? new Date();
        break;
      case 'PAST_DUE':
        subscriptionStatus = SubscriptionStatus.PAST_DUE;
        onboardingCompletedAt = tenant.onboardingCompletedAt ?? new Date();
        break;
      case 'CHURNED':
        subscriptionStatus = SubscriptionStatus.CANCELLED;
        onboardingCompletedAt = tenant.onboardingCompletedAt ?? new Date();
        break;
      default:
        throw new BadRequestException('Invalid operational status');
    }

    await this.prisma.$transaction(async (tx) => {
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
            planCode: 'GROWTH',
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

  async getInvoiceDownload(tenantId: string, invoiceId: string) {
    return this.billing.buildInvoiceDownloadPayload(tenantId, invoiceId);
  }
}
