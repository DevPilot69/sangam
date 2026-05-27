import { prisma } from "@sangam/db";
import {
  ForbiddenError,
  NotFoundError,
} from "@sangam/api-kit";
import { buildEmployeeLoginUsername } from "../shared/company-code";
import {
  buildDefaultPassword,
  ensureTenantCompanyCode,
  provisionPortalForEmployee,
  resetUserToDefaultPassword,
} from "./employee-credentials-service";

/**
 * Password manager service — ported from
 *   src/modules/auth/password-admin.service.ts
 *
 * Used by:
 *   - /v1/tenant/password-manager/* (employee-only resets)
 *   - /v1/platform/password-manager/* (platform-wide resets, including
 *     tenant admin targets) — wired in Phase 5
 */

export type PasswordManagerAccountDto = {
  userId: string | null;
  employeeId: string | null;
  accountType: "tenant_admin" | "employee";
  name: string;
  email: string;
  employeeCode: string | null;
  hasLogin: boolean;
  loginUsername: string | null;
  defaultPassword: string;
};

const userSelect = {
  id: true,
  email: true,
  loginUsername: true,
  name: true,
  employee: {
    select: { id: true, employeeCode: true, email: true, deletedAt: true },
  },
  roles: { select: { role: { select: { name: true } } } },
} as const;

function classifyAccountType(
  roleNames: string[],
): "tenant_admin" | "employee" {
  if (roleNames.includes("EMPLOYEE")) return "employee";
  return "tenant_admin";
}

async function defaultPasswordForTenant(tenantId: string): Promise<string> {
  const companyCode = await ensureTenantCompanyCode(tenantId);
  return buildDefaultPassword(companyCode);
}

async function assertTenant(tenantId: string) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!t) throw new NotFoundError("Tenant not found");
}

export async function listForPlatform(
  tenantId: string,
  filter: "all" | "tenant_admin" | "employee" = "all",
): Promise<PasswordManagerAccountDto[]> {
  await assertTenant(tenantId);
  const defaultPassword = await defaultPasswordForTenant(tenantId);
  const companyCode = await ensureTenantCompanyCode(tenantId);

  const users = await prisma.user.findMany({
    where: { tenantId, deletedAt: null },
    select: userSelect,
    orderBy: { name: "asc" },
  });

  const accounts: PasswordManagerAccountDto[] = [];

  for (const u of users) {
    const roleNames = u.roles.map((r) => r.role.name);
    const accountType = classifyAccountType(roleNames);
    if (filter !== "all" && filter !== accountType) continue;

    const employeeCode = u.employee?.deletedAt
      ? null
      : (u.employee?.employeeCode ?? null);
    const loginUsername =
      accountType === "employee"
        ? (u.loginUsername ??
          (employeeCode
            ? buildEmployeeLoginUsername(companyCode, employeeCode)
            : null))
        : u.email;

    accounts.push({
      userId: u.id,
      employeeId: u.employee?.deletedAt ? null : (u.employee?.id ?? null),
      accountType,
      name: u.name,
      email: u.employee?.email ?? u.email,
      employeeCode,
      hasLogin: true,
      loginUsername,
      defaultPassword,
    });
  }

  if (filter === "all" || filter === "employee") {
    const withoutLogin = await prisma.employee.findMany({
      where: { tenantId, deletedAt: null, userId: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeCode: true,
      },
      orderBy: { firstName: "asc" },
    });

    for (const e of withoutLogin) {
      accounts.push({
        userId: null,
        employeeId: e.id,
        accountType: "employee",
        name: `${e.firstName} ${e.lastName}`.trim(),
        email: e.email,
        employeeCode: e.employeeCode,
        hasLogin: false,
        loginUsername: buildEmployeeLoginUsername(companyCode, e.employeeCode),
        defaultPassword,
      });
    }
  }

  return accounts.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listEmployeesForTenant(
  tenantId: string,
): Promise<PasswordManagerAccountDto[]> {
  await assertTenant(tenantId);
  const defaultPassword = await defaultPasswordForTenant(tenantId);
  const companyCode = await ensureTenantCompanyCode(tenantId);

  const employees = await prisma.employee.findMany({
    where: { tenantId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      employeeCode: true,
      userId: true,
      user: {
        select: { id: true, loginUsername: true, name: true },
      },
    },
    orderBy: { firstName: "asc" },
  });

  return employees.map((e) => ({
    userId: e.userId,
    employeeId: e.id,
    accountType: "employee" as const,
    name: e.user?.name ?? `${e.firstName} ${e.lastName}`.trim(),
    email: e.email,
    employeeCode: e.employeeCode,
    hasLogin: !!e.userId,
    loginUsername:
      e.user?.loginUsername ??
      buildEmployeeLoginUsername(companyCode, e.employeeCode),
    defaultPassword,
  }));
}

export async function resetPasswordByUserId(
  tenantId: string,
  targetUserId: string,
  opts: {
    actorUserId: string | null;
    allowTenantAdminTargets: boolean;
    forbidSelf?: boolean;
  },
) {
  if (opts.forbidSelf && opts.actorUserId === targetUserId) {
    throw new ForbiddenError(
      "Use change password in settings to update your own password",
    );
  }

  const user = await prisma.user.findFirst({
    where: { id: targetUserId, tenantId, deletedAt: null },
    select: userSelect,
  });
  if (!user) throw new NotFoundError("User not found");

  const accountType = classifyAccountType(
    user.roles.map((r) => r.role.name),
  );
  if (accountType === "tenant_admin" && !opts.allowTenantAdminTargets) {
    throw new ForbiddenError(
      "Tenant admins can only reset employee portal passwords",
    );
  }

  const result = await resetUserToDefaultPassword(tenantId, targetUserId);

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: opts.actorUserId ?? undefined,
      action: "password.admin_reset_default",
      entityType: "User",
      entityId: targetUserId,
      diff: { accountType, username: result.username },
    },
  });

  return { ok: true as const, userId: targetUserId, ...result };
}

export async function resetPasswordByEmployeeId(
  tenantId: string,
  employeeId: string,
  actorUserId: string | null,
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!employee) throw new NotFoundError("Employee not found");

  if (employee.userId) {
    const result = await resetUserToDefaultPassword(tenantId, employee.userId);
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId ?? undefined,
        action: "password.admin_reset_default",
        entityType: "Employee",
        entityId: employeeId,
        diff: { username: result.username },
      },
    });
    return {
      ok: true as const,
      userId: employee.userId,
      employeeId,
      portalCreated: false,
      ...result,
    };
  }

  const creds = await provisionPortalForEmployee(tenantId, employeeId);
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: actorUserId ?? undefined,
      action: "password.admin_reset_default",
      entityType: "Employee",
      entityId: employeeId,
      diff: { username: creds.username, portalCreated: true },
    },
  });

  const row = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userId: true },
  });

  return {
    ok: true as const,
    userId: row!.userId!,
    employeeId,
    portalCreated: true,
    username: creds.username,
    defaultPassword: creds.defaultPassword,
  };
}
