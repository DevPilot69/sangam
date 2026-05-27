import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { buildEmployeeLoginUsername } from '../../shared/company-code';
import { EmployeeCredentialsService } from './employee-credentials.service';

export type PasswordManagerAccountDto = {
  userId: string | null;
  employeeId: string | null;
  accountType: 'tenant_admin' | 'employee';
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

@Injectable()
export class PasswordAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: EmployeeCredentialsService,
  ) {}

  private classifyAccountType(roleNames: string[]): 'tenant_admin' | 'employee' {
    if (roleNames.includes('EMPLOYEE')) return 'employee';
    return 'tenant_admin';
  }

  private async defaultPasswordForTenant(tenantId: string): Promise<string> {
    const companyCode = await this.credentials.ensureTenantCompanyCode(tenantId);
    return this.credentials.buildDefaultPassword(companyCode);
  }

  async listForPlatform(
    tenantId: string,
    filter: 'all' | 'tenant_admin' | 'employee' = 'all',
  ): Promise<PasswordManagerAccountDto[]> {
    await this.assertTenant(tenantId);
    const defaultPassword = await this.defaultPasswordForTenant(tenantId);
    const companyCode = await this.credentials.ensureTenantCompanyCode(tenantId);

    const users = await this.prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      select: userSelect,
      orderBy: { name: 'asc' },
    });

    const accounts: PasswordManagerAccountDto[] = [];

    for (const u of users) {
      const roleNames = u.roles.map((r) => r.role.name);
      const accountType = this.classifyAccountType(roleNames);
      if (filter !== 'all' && filter !== accountType) continue;

      const employeeCode = u.employee?.deletedAt
        ? null
        : u.employee?.employeeCode ?? null;
      const loginUsername =
        accountType === 'employee'
          ? u.loginUsername ??
            (employeeCode
              ? buildEmployeeLoginUsername(companyCode, employeeCode)
              : null)
          : u.email;

      accounts.push({
        userId: u.id,
        employeeId: u.employee?.deletedAt ? null : u.employee?.id ?? null,
        accountType,
        name: u.name,
        email: u.employee?.email ?? u.email,
        employeeCode,
        hasLogin: true,
        loginUsername,
        defaultPassword,
      });
    }

    if (filter === 'all' || filter === 'employee') {
      const withoutLogin = await this.prisma.employee.findMany({
        where: { tenantId, deletedAt: null, userId: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeCode: true,
        },
        orderBy: { firstName: 'asc' },
      });

      for (const e of withoutLogin) {
        accounts.push({
          userId: null,
          employeeId: e.id,
          accountType: 'employee',
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

  async listEmployeesForTenant(
    tenantId: string,
  ): Promise<PasswordManagerAccountDto[]> {
    await this.assertTenant(tenantId);
    const defaultPassword = await this.defaultPasswordForTenant(tenantId);
    const companyCode = await this.credentials.ensureTenantCompanyCode(tenantId);

    const employees = await this.prisma.employee.findMany({
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
      orderBy: { firstName: 'asc' },
    });

    return employees.map((e) => ({
      userId: e.userId,
      employeeId: e.id,
      accountType: 'employee' as const,
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

  async resetPasswordByUserId(
    tenantId: string,
    targetUserId: string,
    opts: {
      actorUserId: string | null;
      allowTenantAdminTargets: boolean;
      forbidSelf?: boolean;
    },
  ) {
    if (opts.forbidSelf && opts.actorUserId === targetUserId) {
      throw new ForbiddenException(
        'Use change password in settings to update your own password',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId, deletedAt: null },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('User not found');

    const accountType = this.classifyAccountType(
      user.roles.map((r) => r.role.name),
    );
    if (accountType === 'tenant_admin' && !opts.allowTenantAdminTargets) {
      throw new ForbiddenException(
        'Tenant admins can only reset employee portal passwords',
      );
    }

    const result = await this.credentials.resetUserToDefaultPassword(
      tenantId,
      targetUserId,
    );

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: opts.actorUserId ?? undefined,
        action: 'password.admin_reset_default',
        entityType: 'User',
        entityId: targetUserId,
        diff: { accountType, username: result.username },
      },
    });

    return { ok: true as const, userId: targetUserId, ...result };
  }

  async resetPasswordByEmployeeId(
    tenantId: string,
    employeeId: string,
    actorUserId: string | null,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
      select: { id: true, userId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    if (employee.userId) {
      const result = await this.credentials.resetUserToDefaultPassword(
        tenantId,
        employee.userId,
      );
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId ?? undefined,
          action: 'password.admin_reset_default',
          entityType: 'Employee',
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

    const creds = await this.credentials.provisionPortalForEmployee(
      tenantId,
      employeeId,
    );
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId ?? undefined,
        action: 'password.admin_reset_default',
        entityType: 'Employee',
        entityId: employeeId,
        diff: { username: creds.username, portalCreated: true },
      },
    });

    const row = await this.prisma.employee.findUnique({
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

  private async assertTenant(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!t) throw new NotFoundException('Tenant not found');
  }
}
