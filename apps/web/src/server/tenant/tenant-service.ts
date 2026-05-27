import { prisma, type Prisma } from "@sangam/db";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@sangam/api-kit";
import type { Tenant } from "@sangam/contracts";
import { deepMergeJson } from "../shared/deep-merge";

/**
 * Tenant service — ported from src/modules/tenant/tenant.service.ts.
 *
 * Behavior preserved 1:1:
 *   - `getCurrent`         fetches tenant + subscription + flattened settings
 *   - `patchSettings`      deep-merges the patch into existing settings JSON
 *   - `updateCurrent`      partial PATCH for name/legalName/industry/country
 *                          and rejects companyCode (only platform may set it)
 *   - `completeOnboarding` checks required prerequisites (name, legalName,
 *                          industry, >=1 active department, >=1 active
 *                          designation) and stamps onboardingCompletedAt.
 */

async function fetchTenantPayload(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
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
  if (!tenant) throw new NotFoundError("Tenant not found");

  const subscription = await prisma.subscription.findUnique({
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
    typeof settingsRaw === "object" &&
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

export function getCurrent(tenantId: string) {
  return fetchTenantPayload(tenantId);
}

export async function patchSettings(
  tenantId: string,
  dto: Tenant.PatchTenantSettingsDto,
) {
  await fetchTenantPayload(tenantId);
  const row = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  const current =
    row?.settings !== null &&
    typeof row?.settings === "object" &&
    !Array.isArray(row?.settings)
      ? (row.settings as Record<string, unknown>)
      : {};
  const patch = JSON.parse(JSON.stringify(dto)) as Record<string, unknown>;
  const merged = deepMergeJson(current, patch);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settings: merged as Prisma.InputJsonValue },
  });

  return fetchTenantPayload(tenantId);
}

export async function updateCurrent(
  tenantId: string,
  dto: Tenant.UpdateTenantDto,
) {
  await fetchTenantPayload(tenantId);
  if (dto.companyCode !== undefined) {
    throw new ForbiddenError(
      "Company code can only be created or updated by platform super admin",
    );
  }
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.legalName !== undefined && { legalName: dto.legalName }),
      ...(dto.industry !== undefined && { industry: dto.industry }),
      ...(dto.country !== undefined && { country: dto.country }),
    },
  });
  return fetchTenantPayload(tenantId);
}

export async function completeOnboarding(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) throw new NotFoundError("Tenant not found");

  if (tenant.onboardingCompletedAt) {
    return {
      alreadyCompleted: true as const,
      onboardingCompletedAt: tenant.onboardingCompletedAt,
    };
  }

  const missing: string[] = [];
  if (!tenant.name?.trim()) missing.push("name");
  if (!tenant.legalName?.trim()) missing.push("legalName");
  if (!tenant.industry?.trim()) missing.push("industry");

  const deptCount = await prisma.department.count({
    where: { tenantId, deletedAt: null },
  });
  if (deptCount < 1) missing.push("at least one active department");

  const desCount = await prisma.designation.count({
    where: { tenantId, deletedAt: null },
  });
  if (desCount < 1) missing.push("at least one active designation");

  if (missing.length > 0) {
    throw new BadRequestError(
      "Complete required organization setup before finishing onboarding",
      { missing },
    );
  }

  return prisma.tenant.update({
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
