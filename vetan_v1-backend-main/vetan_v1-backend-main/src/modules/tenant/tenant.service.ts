import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { deepMergeJson } from '../../shared/utils/deep-merge';
import { EmployeeCredentialsService } from '../auth/employee-credentials.service';
import { PatchTenantSettingsDto } from './dto/patch-tenant-settings.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: EmployeeCredentialsService,
  ) {}

  async getCurrent(tenantId: string) {
    return this.fetchTenantPayload(tenantId);
  }

  private async fetchTenantPayload(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        companyCode: true,
        name: true,
        legalName: true,
        industry: true,
        country: true,
        settings: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      select: {
        planCode: true,
        status: true,
        currentPeriodEnd: true,
        razorpayCustomerId: true,
        razorpaySubscriptionId: true,
        trialEndsAt: true,
      },
    });

    const settingsRaw = tenant.settings;
    const settings =
      settingsRaw !== null &&
      typeof settingsRaw === 'object' &&
      !Array.isArray(settingsRaw)
        ? (settingsRaw as Record<string, unknown>)
        : {};

    return {
      id: tenant.id,
      slug: tenant.slug,
      companyCode: tenant.companyCode,
      name: tenant.name,
      legalName: tenant.legalName,
      industry: tenant.industry,
      country: tenant.country,
      settings,
      subscription,
      onboardingCompletedAt: tenant.onboardingCompletedAt,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async patchSettings(tenantId: string, dto: PatchTenantSettingsDto) {
    await this.getCurrent(tenantId);
    const row = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const current =
      row?.settings !== null &&
      typeof row?.settings === 'object' &&
      !Array.isArray(row?.settings)
        ? (row.settings as Record<string, unknown>)
        : {};
    const patch = JSON.parse(JSON.stringify(dto)) as Record<string, unknown>;
    const merged = deepMergeJson(current, patch);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: merged as Prisma.InputJsonValue },
    });

    return this.fetchTenantPayload(tenantId);
  }

  async updateCurrent(tenantId: string, dto: UpdateTenantDto) {
    await this.getCurrent(tenantId);
    if (dto.companyCode !== undefined) {
      throw new ForbiddenException(
        'Company code can only be created or updated by platform super admin',
      );
    }
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.legalName !== undefined && { legalName: dto.legalName }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.country !== undefined && { country: dto.country }),
      },
    });
    return this.fetchTenantPayload(tenantId);
  }

  async completeOnboarding(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (tenant.onboardingCompletedAt) {
      return {
        alreadyCompleted: true as const,
        onboardingCompletedAt: tenant.onboardingCompletedAt,
      };
    }

    const missing: string[] = [];
    if (!tenant.name?.trim()) missing.push('name');
    if (!tenant.legalName?.trim()) missing.push('legalName');
    if (!tenant.industry?.trim()) missing.push('industry');

    const deptCount = await this.prisma.department.count({
      where: { tenantId, deletedAt: null },
    });
    if (deptCount < 1) missing.push('at least one active department');

    const desCount = await this.prisma.designation.count({
      where: { tenantId, deletedAt: null },
    });
    if (desCount < 1) missing.push('at least one active designation');

    if (missing.length > 0) {
      throw new BadRequestException({
        message:
          'Complete required organization setup before finishing onboarding',
        missing: missing,
      });
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingCompletedAt: new Date() },
      select: {
        id: true,
        slug: true,
        name: true,
        legalName: true,
        industry: true,
        country: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
