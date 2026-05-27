import { Injectable } from '@nestjs/common';
import { EmploymentStatus, LeaveRequestStatus, PayrollRunStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const MONTHS = [
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

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(tenantId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const activeEmployees = await this.prisma.employee.count({
      where: { tenantId, deletedAt: null, status: EmploymentStatus.ACTIVE },
    });

    const pendingLeave = await this.prisma.leaveRequest.count({
      where: { tenantId, status: LeaveRequestStatus.PENDING },
    });

    const latestRun = await this.prisma.payrollRun.findFirst({
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

    const runs = await this.prisma.payrollRun.findMany({
      where: {
        tenantId,
        status: { in: [PayrollRunStatus.DISBURSED, PayrollRunStatus.LOCKED] },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
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

    const pendingPayroll = await this.prisma.payrollRun.count({
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
      payrollTrend: payrollTrend.map(({ month: m, amount }) => ({ month: m, amount })),
    };
  }
}
