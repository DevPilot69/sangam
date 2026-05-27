import { PrismaClient } from '@prisma/client';

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

async function main() {
  for (const code of PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, description: code },
      update: {},
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${PERMISSION_CODES.length} permissions.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
