/**
 * Append yesterday's attendance for all active employees (demo "live" feel).
 *   npm run simulate:attendance
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const STATUSES = ['PRESENT', 'PRESENT', 'LATE', 'WFH', 'ABSENT'] as const;

async function main() {
  const slug = process.env.TENANT_SLUG ?? 'vetan-tech';
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) throw new Error(`Tenant not found: ${slug}`);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const employees = await prisma.employee.findMany({
    where: { tenantId: tenant.id, deletedAt: null, status: 'ACTIVE' },
    select: { id: true },
  });

  let created = 0;
  for (const emp of employees) {
    try {
      await prisma.attendanceRecord.create({
        data: {
          tenantId: tenant.id,
          employeeId: emp.id,
          date: yesterday,
          status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
        },
      });
      created++;
    } catch {
      /* unique per employee+date */
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Attendance for ${yesterday.toISOString().slice(0, 10)}: ${created} records (${slug})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
