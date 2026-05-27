import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { EnvVars } from '../../config/validate-env';
import { PrismaService } from '../../database/prisma.service';
import {
  buildDefaultOrgPassword,
  buildEmployeeLoginUsername,
  isValidCompanyCode,
  normalizeCompanyCode,
  suggestCompanyCodeFromName,
} from '../../shared/company-code';

const BCRYPT_ROUNDS = 12;

export type EmployeePortalCredentials = {
  username: string;
  defaultPassword: string;
  workspaceSlug: string;
  companyCode: string;
};

@Injectable()
export class EmployeeCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  getPasswordKeyword(): string {
    return this.config.get('EMPLOYEE_DEFAULT_PASSWORD_KEYWORD', {
      infer: true,
    });
  }

  async resolveUniqueCompanyCode(
    preferred: string,
    excludeTenantId?: string,
  ): Promise<string> {
    let code = normalizeCompanyCode(preferred);
    if (!isValidCompanyCode(code)) {
      throw new BadRequestException(
        'Company code must be 2–8 letters or numbers',
      );
    }

    for (let attempt = 0; attempt < 20; attempt++) {
      const taken = await this.prisma.tenant.findFirst({
        where: {
          companyCode: code,
          ...(excludeTenantId ? { NOT: { id: excludeTenantId } } : {}),
        },
        select: { id: true },
      });
      if (!taken) return code;
      code = `${code.slice(0, 6)}${attempt + 1}`.slice(0, 8);
    }

    throw new ConflictException('Could not allocate a unique company code');
  }

  suggestFromName(name: string): string {
    return suggestCompanyCodeFromName(name);
  }

  async ensureTenantCompanyCode(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, companyCode: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (tenant.companyCode) return tenant.companyCode;

    const code = await this.resolveUniqueCompanyCode(
      suggestCompanyCodeFromName(tenant.name),
    );
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { companyCode: code },
    });
    return code;
  }

  buildDefaultPassword(companyCode: string): string {
    return buildDefaultOrgPassword(companyCode, this.getPasswordKeyword());
  }

  async provisionPortalForEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<EmployeePortalCredentials> {
    const employee = await this.prisma.employee.findFirst({
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
    if (!employee) throw new NotFoundException('Employee not found');

    const companyCode = employee.tenant.companyCode
      ? employee.tenant.companyCode
      : await this.ensureTenantCompanyCode(tenantId);

    const username = buildEmployeeLoginUsername(
      companyCode,
      employee.employeeCode,
    );
    const defaultPassword = this.buildDefaultPassword(companyCode);
    const passwordHash = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);

    if (employee.userId) {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: employee.userId },
          data: {
            loginUsername: username,
            passwordHash,
            failedLoginCount: 0,
            lockedUntil: null,
          },
        }),
        this.prisma.refreshToken.deleteMany({
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

    const existingByUsername = await this.prisma.user.findFirst({
      where: { tenantId, loginUsername: username, deletedAt: null },
    });
    if (existingByUsername) {
      throw new ConflictException(
        `Login username ${username} is already in use`,
      );
    }

    let employeeRole = await this.prisma.role.findFirst({
      where: { tenantId, name: 'EMPLOYEE' },
    });
    if (!employeeRole) {
      employeeRole = await this.prisma.role.create({
        data: {
          tenantId,
          name: 'EMPLOYEE',
          description: 'Employee self-service portal',
        },
      });
    }

    await this.prisma.$transaction(async (tx) => {
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
          roles: { create: [{ roleId: employeeRole!.id }] },
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

  async resetUserToDefaultPassword(
    tenantId: string,
    userId: string,
  ): Promise<{ username: string; defaultPassword: string }> {
    const user = await this.prisma.user.findFirst({
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
    if (!user) throw new NotFoundException('User not found');

    const companyCode = user.tenant.companyCode
      ? user.tenant.companyCode
      : await this.ensureTenantCompanyCode(tenantId);

    const isEmployee = user.roles.some((r) => r.role.name === 'EMPLOYEE');
    const username = isEmployee
      ? user.loginUsername ??
        (user.employee
          ? buildEmployeeLoginUsername(companyCode, user.employee.employeeCode)
          : null)
      : user.email;

    if (!username) {
      throw new BadRequestException('Cannot resolve login username for this user');
    }

    const defaultPassword = this.buildDefaultPassword(companyCode);
    const passwordHash = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
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
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);

    return { username, defaultPassword };
  }
}
