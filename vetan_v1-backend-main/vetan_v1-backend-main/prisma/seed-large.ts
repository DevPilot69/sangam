/**
 * Large-scale seed for performance testing (manufacturing tenant).
 *   npm run seed:large
 */
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { EmploymentStatus } from '@prisma/client';
import { seedDemoTenant } from './seeds/seed-tenant';
import { DEMO_PASSWORD, TENANT_PROFILES } from './seeds/tenants.config';

const prisma = new PrismaClient();
const TARGET = Number(process.env.LARGE_EMPLOYEE_COUNT ?? 5000);

async function main() {
  const permissions = await prisma.permission.findMany();
  if (permissions.length === 0) {
    throw new Error('Run npx prisma db seed first');
  }

  const profile = TENANT_PROFILES.find((p) => p.slug === 'bharat-manufacturing');
  if (!profile) throw new Error('bharat-manufacturing profile missing');

  const existing = await prisma.tenant.findUnique({
    where: { slug: 'bharat-manufacturing' },
  });

  if (!existing) {
    await seedDemoTenant(prisma, profile, permissions, 2);
  }

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: 'bharat-manufacturing' },
  });

  const current = await prisma.employee.count({
    where: { tenantId: tenant.id, deletedAt: null },
  });

  const toCreate = Math.max(0, TARGET - current);
  if (toCreate === 0) {
    // eslint-disable-next-line no-console
    console.log(`Already ${current} employees — nothing to add.`);
    return;
  }

  const depts = await prisma.department.findMany({
    where: { tenantId: tenant.id, deletedAt: null },
  });
  const desigs = await prisma.designation.findMany({
    where: { tenantId: tenant.id, deletedAt: null },
  });
  if (depts.length === 0 || desigs.length === 0) {
    throw new Error('Seed bharat-manufacturing base tenant first');
  }

  faker.seed(99999);
  // eslint-disable-next-line no-console
  console.log(`Adding ${toCreate} employees to bharat-manufacturing…`);

  const batch = 200;
  for (let offset = 0; offset < toCreate; offset += batch) {
    const chunk = Math.min(batch, toCreate - offset);
    await prisma.$transaction(
      Array.from({ length: chunk }, (_, i) => {
        const seq = current + offset + i + 1;
        const fn = faker.person.firstName();
        const ln = faker.person.lastName();
        return prisma.employee.create({
          data: {
            tenantId: tenant.id,
            employeeCode: `EMP-${String(seq).padStart(5, '0')}`,
            firstName: fn,
            lastName: ln,
            email: `bulk.${seq}@bharat-manufacturing.demo`,
            departmentId: depts[seq % depts.length].id,
            designationId: desigs[seq % desigs.length].id,
            status: EmploymentStatus.ACTIVE,
            dateOfJoining: faker.date.past({ years: 3 }),
            ctcAnnual: faker.number.int({ min: 300000, max: 1200000 }),
          },
        });
      }),
    );
    // eslint-disable-next-line no-console
    console.log(`  …${Math.min(offset + chunk, toCreate)}/${toCreate}`);
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Total ~${TARGET} employees. Password unchanged: ${DEMO_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
