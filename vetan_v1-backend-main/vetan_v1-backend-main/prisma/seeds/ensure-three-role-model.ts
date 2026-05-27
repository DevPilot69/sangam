import { PrismaClient } from '@prisma/client';

const LEGACY_ADMIN_ROLES = [
  'TENANT_ADMIN',
  'HR_MANAGER',
  'FINANCE_MANAGER',
  'MANAGER',
] as const;

const DEMO_LEGACY_EMAILS = [/^hr@.+\.demo$/i, /^finance@.+\.demo$/i];

/**
 * Enforces Vetan's 3-role model per tenant: ADMIN + EMPLOYEE only.
 * Migrates existing demo tenants; safe to run on every seed:demo.
 */
export async function ensureThreeRoleModel(
  prisma: PrismaClient,
  slug: string,
  allPermissionIds: { id: string }[],
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return;

  const allPermIds = allPermissionIds.map((p) => p.id);

  let adminRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: 'ADMIN' },
  });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'ADMIN',
        description: 'Full workspace administrator',
        permissions: {
          create: allPermIds.map((permissionId) => ({ permissionId })),
        },
      },
    });
  } else {
    await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
    await prisma.rolePermission.createMany({
      data: allPermIds.map((permissionId) => ({ roleId: adminRole!.id, permissionId })),
      skipDuplicates: true,
    });
  }

  let employeeRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: 'EMPLOYEE' },
  });
  if (!employeeRole) {
    employeeRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'EMPLOYEE',
        description: 'Employee self-service portal',
      },
    });
  }

  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id, deletedAt: null },
    include: {
      roles: { include: { role: true } },
      employee: true,
    },
  });

  for (const user of users) {
    if (DEMO_LEGACY_EMAILS.some((re) => re.test(user.email))) {
      await prisma.user.update({
        where: { id: user.id },
        data: { deletedAt: new Date() },
      });
      continue;
    }

    const roleNames = user.roles.map((ur) => ur.role.name);
    const isEmployeePortal =
      /^employee@.+\.demo$/i.test(user.email) ||
      (user.employee != null && !/^admin@.+\.demo$/i.test(user.email));

    if (isEmployeePortal) {
      await prisma.userRole.deleteMany({ where: { userId: user.id } });
      await prisma.userRole.create({
        data: { userId: user.id, roleId: employeeRole.id },
      });
      continue;
    }

    const hasLegacyAdmin = roleNames.some((n) =>
      (LEGACY_ADMIN_ROLES as readonly string[]).includes(n),
    );
    if (hasLegacyAdmin || roleNames.includes('ADMIN')) {
      await prisma.userRole.deleteMany({ where: { userId: user.id } });
      await prisma.userRole.create({
        data: { userId: user.id, roleId: adminRole.id },
      });
    }
  }

  const legacyRoles = await prisma.role.findMany({
    where: {
      tenantId: tenant.id,
      name: { in: [...LEGACY_ADMIN_ROLES] },
    },
  });
  let removedLegacyRoles = 0;
  for (const role of legacyRoles) {
    const stillUsed = await prisma.userRole.count({ where: { roleId: role.id } });
    if (stillUsed === 0) {
      await prisma.role.delete({ where: { id: role.id } });
      removedLegacyRoles++;
    }
  }

  if (removedLegacyRoles > 0) {
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${slug} — 3-role model (removed ${removedLegacyRoles} legacy role(s))`);
  }
}
