import {
  prisma,
  EmploymentStatus,
  LeaveRequestStatus,
  PayrollRunStatus,
} from "@sangam/db";

/**
 * Dashboard service — ported from src/modules/dashboard/dashboard.service.ts.
 *
 * Tenant-wide KPI summary: active headcount, pending approvals, current
 * month's payroll total, and a 6-point trailing trend.
 *
 * NOTE on `daysToPayroll` — keeps the original behaviour (count down to the
 * last day of the current month). Refines could plug in tenant payroll cutoff
 * day from settings; out of scope for this port.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function summary(tenantId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const activeEmployees = await prisma.employee.count({
    where: { tenantId, deletedAt: null, status: EmploymentStatus.ACTIVE },
  });

  const pendingLeave = await prisma.leaveRequest.count({
    where: { tenantId, status: LeaveRequestStatus.PENDING },
  });

  const latestRun = await prisma.payrollRun.findFirst({
    where: { tenantId, periodYear: year, periodMonth: month },
    include: { entries: true },
  });

  let totalPayrollMonth = 0;
  if (latestRun) {
    totalPayrollMonth = latestRun.entries.reduce(
      (s, e) => s + Number(e.gross),
      0,
    );
  }

  const runs = await prisma.payrollRun.findMany({
    where: {
      tenantId,
      status: { in: [PayrollRunStatus.DISBURSED, PayrollRunStatus.LOCKED] },
    },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    take: 6,
    include: { entries: true },
  });

  const payrollTrend = runs
    .map((r) => ({
      month: MONTHS[r.periodMonth - 1] ?? String(r.periodMonth),
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      amount: r.entries.reduce((s, e) => s + Number(e.gross), 0),
    }))
    .reverse();

  const pendingPayroll = await prisma.payrollRun.count({
    where: {
      tenantId,
      status: {
        in: [
          PayrollRunStatus.PENDING,
          PayrollRunStatus.APPROVED,
          PayrollRunStatus.PROCESSING,
        ],
      },
    },
  });

  const daysToPayroll = Math.max(
    0,
    new Date(year, month, 0).getDate() - now.getDate(),
  );

  return {
    totalPayrollMonth,
    activeEmployees,
    pendingApprovals: pendingLeave + pendingPayroll,
    daysToPayroll,
    payrollTrend: payrollTrend.map(({ month: m, amount }) => ({
      month: m,
      amount,
    })),
  };
}
