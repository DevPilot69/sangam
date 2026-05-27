import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEMO_PASSWORD } from './tenants.config';

const BCRYPT_ROUNDS = 12;

/** Ensures employee@slug.demo exists and is linked to EMP-0001 for an existing tenant. */
export async function ensureEmployeePortalUser(
  prisma: PrismaClient,
  slug: string,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return;

  const email = `employee@${slug}.demo`;
  const existingUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email },
  });
  if (existingUser) return;

  const employeeRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: 'EMPLOYEE' },
  });
  if (!employeeRole) return;

  const firstEmployee = await prisma.employee.findFirst({
    where: { tenantId: tenant.id, employeeCode: 'EMP-0001', deletedAt: null },
  });
  if (!firstEmployee) return;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      name: `${firstEmployee.firstName} ${firstEmployee.lastName}`.trim(),
      passwordHash,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
      roles: { create: [{ roleId: employeeRole.id }] },
    },
  });

  await prisma.employee.update({
    where: { id: firstEmployee.id },
    data: { userId: user.id },
  });

  // eslint-disable-next-line no-console
  console.log(`  + employee portal user for ${slug}`);
}
