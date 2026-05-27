/**
 * Demo enterprise data — run after migrations:
 *   npx prisma db seed
 *   npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed-demo.ts
 *
 * Or: npm run seed:demo
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { backfillBillingForTenant } from './seeds/billing-ops';
import { ensureEmployeePortalUser } from './seeds/ensure-employee-portal-user';
import { ensureThreeRoleModel } from './seeds/ensure-three-role-model';
import { seedDemoTenant } from './seeds/seed-tenant';
import { DEMO_PASSWORD, TENANT_PROFILES } from './seeds/tenants.config';

const PLATFORM_ADMIN_EMAIL = 'superadmin@vetan.app';

const prisma = new PrismaClient();

const PERMISSION_CODES = [
  'employees:read',
  'employees:write',
  'payroll:read',
  'payroll:run',
  'payroll:approve',
  'leave:read',
  'leave:approve',
  'reports:read',
  'settings:read',
  'settings:write',
  'billing:read',
  'attendance:read',
  'attendance:write',
] as const;

async function ensurePermissions() {
  for (const code of PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, description: code },
      update: {},
    });
  }
  return prisma.permission.findMany();
}

async function main() {
  const onlySlug = process.env.DEMO_TENANT_SLUG?.trim();
  const profiles = onlySlug
    ? TENANT_PROFILES.filter((p) => p.slug === onlySlug)
    : TENANT_PROFILES;

  if (profiles.length === 0) {
    throw new Error(`No tenant profile for slug: ${onlySlug}`);
  }

  // eslint-disable-next-line no-console
  console.log('Seeding permissions…');
  const permissions = await ensurePermissions();

  // eslint-disable-next-line no-console
  console.log(`Seeding ${profiles.length} demo tenant(s)…`);
  // eslint-disable-next-line no-console
  console.log(`Demo password for all users: ${DEMO_PASSWORD}`);

  for (let i = 0; i < profiles.length; i++) {
    await seedDemoTenant(prisma, profiles[i], permissions, i);
    await ensureThreeRoleModel(prisma, profiles[i].slug, permissions);
    await ensureEmployeePortalUser(prisma, profiles[i].slug);
    await backfillBillingForTenant(prisma, profiles[i].slug, i);
  }

  const platformHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await prisma.platformAdmin.upsert({
    where: { email: PLATFORM_ADMIN_EMAIL },
    create: {
      email: PLATFORM_ADMIN_EMAIL,
      name: 'Vetan Platform Admin',
      passwordHash: platformHash,
      status: 'ACTIVE',
    },
    update: {
      passwordHash: platformHash,
      status: 'ACTIVE',
    },
  });

  // eslint-disable-next-line no-console
  console.log('\nDone. Example login:');
  // eslint-disable-next-line no-console
  console.log('  Workspace: vetan-tech');
  // eslint-disable-next-line no-console
  console.log('  Email:     admin@vetan-tech.demo');
  // eslint-disable-next-line no-console
  console.log(`  Password:  ${DEMO_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log('\nEmployee self-service:');
  // eslint-disable-next-line no-console
  console.log('  Workspace: vetan-tech');
  // eslint-disable-next-line no-console
  console.log('  Email:     employee@vetan-tech.demo');
  // eslint-disable-next-line no-console
  console.log(`  Password:  ${DEMO_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log('\nPlatform super admin:');
  // eslint-disable-next-line no-console
  console.log(`  URL:       /platform/login`);
  // eslint-disable-next-line no-console
  console.log(`  Email:     ${PLATFORM_ADMIN_EMAIL}`);
  // eslint-disable-next-line no-console
  console.log(`  Password:  ${DEMO_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
