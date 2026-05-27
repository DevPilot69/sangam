import bcrypt from "bcryptjs";
import { prisma } from "@sangam/db";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@sangam/api-kit";
import {
  buildDefaultOrgPassword,
  buildEmployeeLoginUsername,
  isValidCompanyCode,
  normalizeCompanyCode,
  suggestCompanyCodeFromName,
} from "../shared/company-code";

const BCRYPT_ROUNDS = 12;

export type EmployeePortalCredentials = {
  username: string;
  defaultPassword: string;
  workspaceSlug: string;
  companyCode: string;
};

function getPasswordKeyword(): string {
  return process.env.EMPLOYEE_DEFAULT_PASSWORD_KEYWORD ?? "Vetan";
}

export async function resolveUniqueCompanyCode(
  preferred: string,
  excludeTenantId?: string,
): Promise<string> {
  let code = normalizeCompanyCode(preferred);
  if (!isValidCompanyCode(code)) {
    throw new BadRequestError("Company code must be 2–8 letters or numbers");
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const taken = await prisma.tenant.findFirst({
      where: {
        companyCode: code,
        ...(excludeTenantId ? { NOT: { id: excludeTenantId } } : {}),
      },
      select: { id: true },
    });
    if (!taken) return code;
    code = `${code.slice(0, 6)}${attempt + 1}`.slice(0, 8);
  }

  throw new ConflictError("Could not allocate a unique company code");
}

export function suggestFromName(name: string): string {
  return suggestCompanyCodeFromName(name);
}

export async function ensureTenantCompanyCode(
  tenantId: string,
): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, companyCode: true },
  });
  if (!tenant) throw new NotFoundError("Tenant not found");

  if (tenant.companyCode) return tenant.companyCode;

  const code = await resolveUniqueCompanyCode(
    suggestCompanyCodeFromName(tenant.name),
  );
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { companyCode: code },
  });
  return code;
}

export function buildDefaultPassword(companyCode: string): string {
  return buildDefaultOrgPassword(companyCode, getPasswordKeyword());
}

export async function provisionPortalForEmployee(
  tenantId: string,
  employeeId: string,
): Promise<EmployeePortalCredentials> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      employeeCode: true,
      userId: true,
      tenant: { select: { slug: true, companyCode: true, name: true } },
    },
  });
  if (!employee) throw new NotFoundError("Employee not found");

  const companyCode = employee.tenant.companyCode
    ? employee.tenant.companyCode
    : await ensureTenantCompanyCode(tenantId);

  const username = buildEmployeeLoginUsername(
    companyCode,
    employee.employeeCode,
  );
  const defaultPassword = buildDefaultPassword(companyCode);
  const passwordHash = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);

  if (employee.userId) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: employee.userId },
        data: {
          loginUsername: username,
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: employee.userId },
      }),
    ]);
    return {
      username,
      defaultPassword,
      workspaceSlug: employee.tenant.slug,
      companyCode,
    };
  }

  const emailNorm = employee.email.toLowerCase().trim();

  const existingByUsername = await prisma.user.findFirst({
    where: { tenantId, loginUsername: username, deletedAt: null },
  });
  if (existingByUsername) {
    throw new ConflictError(`Login username ${username} is already in use`);
  }

  let employeeRole = await prisma.role.findFirst({
    where: { tenantId, name: "EMPLOYEE" },
  });
  if (!employeeRole) {
    employeeRole = await prisma.role.create({
      data: {
        tenantId,
        name: "EMPLOYEE",
        description: "Employee self-service portal",
      },
    });
  }
  const employeeRoleId = employeeRole.id;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        tenantId,
        email: emailNorm,
        loginUsername: username,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        passwordHash,
        emailVerifiedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        roles: { create: [{ roleId: employeeRoleId }] },
      },
    });
    await tx.employee.update({
      where: { id: employee.id },
      data: { userId: user.id },
    });
  });

  return {
    username,
    defaultPassword,
    workspaceSlug: employee.tenant.slug,
    companyCode,
  };
}

export async function resetUserToDefaultPassword(
  tenantId: string,
  userId: string,
): Promise<{ username: string; defaultPassword: string }> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    select: {
      id: true,
      loginUsername: true,
      email: true,
      roles: { select: { role: { select: { name: true } } } },
      employee: { select: { employeeCode: true } },
      tenant: { select: { companyCode: true } },
    },
  });
  if (!user) throw new NotFoundError("User not found");

  const companyCode = user.tenant.companyCode
    ? user.tenant.companyCode
    : await ensureTenantCompanyCode(tenantId);

  const isEmployee = user.roles.some((r) => r.role.name === "EMPLOYEE");
  const username = isEmployee
    ? (user.loginUsername ??
      (user.employee
        ? buildEmployeeLoginUsername(companyCode, user.employee.employeeCode)
        : null))
    : user.email;

  if (!username) {
    throw new BadRequestError("Cannot resolve login username for this user");
  }

  const defaultPassword = buildDefaultPassword(companyCode);
  const passwordHash = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        ...(isEmployee && user.employee
          ? {
              loginUsername: buildEmployeeLoginUsername(
                companyCode,
                user.employee.employeeCode,
              ),
            }
          : {}),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    }),
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
  ]);

  return { username, defaultPassword };
}
