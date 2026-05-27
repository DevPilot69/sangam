import { faker } from '@faker-js/faker';
import {
  EmploymentStatus,
  LeaveRequestStatus,
  PayrollRunStatus,
  Prisma,
  PrismaClient,
  SubscriptionStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { TenantProfile } from './tenants.config';
import { DEMO_PASSWORD } from './tenants.config';
import {
  ensureTenantBillingOps,
  seedSubscriptionInvoices,
} from './billing-ops';

const BCRYPT_ROUNDS = 12;
const ATTENDANCE_STATUSES = ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT', 'WFH'] as const;

const FIRST_NAMES = [
  'Ananya',
  'Rahul',
  'Priya',
  'Vikram',
  'Neha',
  'Arjun',
  'Kavya',
  'Rohan',
  'Sneha',
  'Amit',
];
const LAST_NAMES = [
  'Iyer',
  'Verma',
  'Sharma',
  'Patel',
  'Kulkarni',
  'Menon',
  'Reddy',
  'Singh',
  'Gupta',
  'Nair',
];

const DEPARTMENTS = [
  { name: 'Engineering', code: 'ENG' },
  { name: 'Finance', code: 'FIN' },
  { name: 'People Operations', code: 'HR' },
  { name: 'Sales', code: 'SALES' },
  { name: 'Operations', code: 'OPS' },
];

const DESIGNATIONS = [
  { title: 'Software Engineer', grade: 'L3' },
  { title: 'Senior Software Engineer', grade: 'L4' },
  { title: 'Engineering Manager', grade: 'M1' },
  { title: 'HR Business Partner', grade: 'L4' },
  { title: 'Financial Analyst', grade: 'L3' },
  { title: 'Operations Lead', grade: 'M2' },
];

const LEAVE_TYPES = [
  { code: 'CL', name: 'Casual Leave', daysPerYear: 12 },
  { code: 'SL', name: 'Sick Leave', daysPerYear: 10 },
  { code: 'EL', name: 'Earned Leave', daysPerYear: 18 },
];

function monthLabel(year: number, month: number): string {
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${names[month - 1]} ${year}`;
}

export async function seedDemoTenant(
  prisma: PrismaClient,
  profile: TenantProfile,
  permissionIds: { id: string; code: string }[],
  tenantIndex: number,
): Promise<void> {
  faker.seed(20260515 + tenantIndex * 1000);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const allPermIds = permissionIds.map((p) => p.id);

  const existing = await prisma.tenant.findUnique({
    where: { slug: profile.slug },
  });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`  Skip ${profile.slug} (already exists)`);
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      slug: profile.slug,
      name: profile.name,
      legalName: profile.legalName,
      industry: profile.industry,
      country: 'IN',
      settings: profile.settings as Prisma.InputJsonValue,
      onboardingCompletedAt: new Date(),
    },
  });

  const planCode = tenantIndex === 0 ? 'ENTERPRISE' : 'GROWTH';
  const subscription = await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      status: SubscriptionStatus.ACTIVE,
      planCode,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  /** Vetan tenant roles: Admin (full workspace) + Employee (self-service only). */
  const roleDefs = [
    { name: 'ADMIN', perms: allPermIds },
    { name: 'EMPLOYEE', perms: [] as string[] },
  ];

  const roles: Record<string, string> = {};
  for (const rd of roleDefs) {
    const role = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: rd.name,
        description: rd.name,
        permissions: {
          create: rd.perms.map((permissionId) => ({ permissionId })),
        },
      },
    });
    roles[rd.name] = role.id;
  }

  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `admin@${profile.slug}.demo`,
      name: 'Demo Admin',
      passwordHash,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
      roles: { create: [{ roleId: roles.ADMIN }] },
    },
  });

  const depts: { id: string; code: string; name: string }[] = [];
  for (const d of DEPARTMENTS) {
    const row = await prisma.department.create({
      data: { tenantId: tenant.id, name: d.name, code: d.code },
    });
    depts.push({ id: row.id, code: row.code, name: row.name });
  }

  const desigs: { id: string; title: string }[] = [];
  for (let i = 0; i < DESIGNATIONS.length; i++) {
    const d = DESIGNATIONS[i];
    const row = await prisma.designation.create({
      data: {
        tenantId: tenant.id,
        title: d.title,
        grade: d.grade,
        departmentId: depts[i % depts.length].id,
      },
    });
    desigs.push({ id: row.id, title: d.title });
  }

  const year = new Date().getFullYear();
  for (const h of [
    { date: `${year}-01-26`, name: 'Republic Day' },
    { date: `${year}-08-15`, name: 'Independence Day' },
    { date: `${year}-10-02`, name: 'Gandhi Jayanti' },
  ]) {
    await prisma.tenantHoliday.create({
      data: {
        tenantId: tenant.id,
        date: new Date(h.date),
        name: h.name,
      },
    });
  }

  const leaveTypeRows: { id: string; name: string }[] = [];
  for (const lt of LEAVE_TYPES) {
    const row = await prisma.leaveType.create({
      data: {
        tenantId: tenant.id,
        code: lt.code,
        name: lt.name,
        daysPerYear: lt.daysPerYear,
      },
    });
    leaveTypeRows.push({ id: row.id, name: row.name });
  }

  const statuses: EmploymentStatus[] = [
    EmploymentStatus.ACTIVE,
    EmploymentStatus.ACTIVE,
    EmploymentStatus.ACTIVE,
    EmploymentStatus.ON_LEAVE,
    EmploymentStatus.NOTICE,
  ];

  const employeeIds: string[] = [];
  for (let i = 0; i < profile.employeeCount; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length] ?? faker.person.firstName();
    const ln = LAST_NAMES[i % LAST_NAMES.length] ?? faker.person.lastName();
    const dept = depts[i % depts.length];
    const desig = desigs[i % desigs.length];
    const emp = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        employeeCode: `EMP-${String(i + 1).padStart(4, '0')}`,
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}+${i}@${profile.slug}.demo`,
        departmentId: dept.id,
        designationId: desig.id,
        status: statuses[i % statuses.length],
        dateOfJoining: faker.date.past({ years: 4 }),
        ctcAnnual: faker.number.int({ min: 400000, max: 2800000 }),
        pan: `ABCDE${String(1000 + i).slice(-4)}F`,
      },
    });
    employeeIds.push(emp.id);

    if (i === 0) {
      const portalUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: `employee@${profile.slug}.demo`,
          name: `${fn} ${ln}`,
          passwordHash,
          emailVerifiedAt: new Date(),
          status: 'ACTIVE',
          roles: { create: [{ roleId: roles.EMPLOYEE }] },
        },
      });
      await prisma.employee.update({
        where: { id: emp.id },
        data: { userId: portalUser.id },
      });
      await prisma.notification.create({
        data: {
          tenantId: tenant.id,
          userId: portalUser.id,
          title: 'Welcome to Vetan',
          body: 'View payslips, apply for leave, and track attendance from your employee portal.',
        },
      });
    }

    for (const lt of leaveTypeRows) {
      await prisma.leaveBalance.create({
        data: {
          employeeId: emp.id,
          leaveTypeId: lt.id,
          balanceDays: faker.number.float({ min: 2, max: 15, fractionDigits: 1 }),
          year,
        },
      });
    }
  }

  for (let i = 0; i < Math.min(12, employeeIds.length); i++) {
    const empId = employeeIds[i];
    const lt = leaveTypeRows[i % leaveTypeRows.length];
    const start = faker.date.soon({ days: 14 });
    const end = new Date(start);
    end.setDate(end.getDate() + faker.number.int({ min: 1, max: 3 }));
    await prisma.leaveRequest.create({
      data: {
        tenantId: tenant.id,
        employeeId: empId,
        leaveTypeId: lt.id,
        startDate: start,
        endDate: end,
        workingDays: faker.number.float({ min: 1, max: 3, fractionDigits: 1 }),
        reason: 'Personal',
        status:
          i < 5
            ? LeaveRequestStatus.PENDING
            : i < 8
              ? LeaveRequestStatus.APPROVED
              : LeaveRequestStatus.REJECTED,
      },
    });
  }

  const today = new Date();
  for (let d = 0; d < 30; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const sample = employeeIds.slice(0, Math.min(employeeIds.length, 25));
    for (const empId of sample) {
      await prisma.attendanceRecord.create({
        data: {
          tenantId: tenant.id,
          employeeId: empId,
          date,
          status: ATTENDANCE_STATUSES[faker.number.int({ min: 0, max: 5 })],
        },
      });
    }
  }

  const runStatuses: PayrollRunStatus[] = [
    PayrollRunStatus.DISBURSED,
    PayrollRunStatus.DISBURSED,
    PayrollRunStatus.DISBURSED,
    PayrollRunStatus.LOCKED,
    PayrollRunStatus.PENDING,
    PayrollRunStatus.ERROR,
  ];

  for (let m = 0; m < 6; m++) {
    const dt = new Date();
    dt.setMonth(dt.getMonth() - m);
    const periodYear = dt.getFullYear();
    const periodMonth = dt.getMonth() + 1;
    const status = runStatuses[m] ?? PayrollRunStatus.DISBURSED;

    const run = await prisma.payrollRun.create({
      data: {
        tenantId: tenant.id,
        periodYear,
        periodMonth,
        status,
        initiatedById: adminUser.id,
      },
    });

    const activeEmps = await prisma.employee.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      take: Math.min(employeeIds.length, 40),
    });

    for (const emp of activeEmps) {
      const gross = Number(emp.ctcAnnual ?? 600000) / 12;
      const deductions = gross * 0.18;
      const net = gross - deductions;
      await prisma.payrollEntry.create({
        data: {
          payrollRunId: run.id,
          employeeId: emp.id,
          gross,
          deductions,
          net,
          breakdown: {
            basic: gross * 0.4,
            hra: gross * 0.2,
            pf: deductions * 0.5,
          },
        },
      });
    }
  }

  await prisma.notification.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: adminUser.id,
        title: `Payroll ready for ${monthLabel(today.getFullYear(), today.getMonth() + 1)}`,
        body: 'Review and approve the payroll run before the pay date.',
      },
      {
        tenantId: tenant.id,
        userId: adminUser.id,
        title: 'Leave requests pending',
        body: `${Math.min(5, profile.employeeCount)} leave requests need your attention.`,
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: adminUser.id,
        action: 'tenant.onboarding.completed',
        entityType: 'Tenant',
        entityId: tenant.id,
      },
      {
        tenantId: tenant.id,
        userId: adminUser.id,
        action: 'payroll.run.created',
        entityType: 'PayrollRun',
        entityId: tenant.id,
      },
    ],
  });

  await ensureTenantBillingOps(prisma, tenant.id, {
    planCode,
    employeeCount: employeeIds.length,
    seedIndex: tenantIndex,
  });
  const billingOps = await prisma.tenantBillingOps.findUnique({
    where: { tenantId: tenant.id },
  });
  if (billingOps) {
    await seedSubscriptionInvoices(
      prisma,
      subscription.id,
      Number(billingOps.monthlyFeeInr),
      billingOps.paymentStatus,
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    `  ✓ ${profile.slug} — ${profile.employeeCount} employees (admin@${profile.slug}.demo, employee@${profile.slug}.demo)`,
  );
}
