import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveRequestStatus, PayrollRunStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { splitPayslipBreakdown } from '../../shared/documents/payslip-breakdown';
import { renderEmployeePayslipPdf } from '../../shared/documents/employee-payslip-pdf';
import type { LinkedEmployeeContext } from './guards/employee-link.guard';
import { HolidaysService } from '../tenant/org/holidays.service';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTHS = [
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

function periodLabel(year: number, month: number): string {
  return `${SHORT_MONTHS[month - 1] ?? month} ${year}`;
}

function workingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(count, 1);
}

@Injectable()
export class EmployeePortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holidays: HolidaysService,
  ) {}

  async getDashboard(emp: LinkedEmployeeContext) {
    const [latestEntry, balances, pendingLeaves, recentPayslips] =
      await Promise.all([
        this.prisma.payrollEntry.findFirst({
          where: {
            employeeId: emp.id,
            payrollRun: {
              status: {
                in: [
                  PayrollRunStatus.DISBURSED,
                  PayrollRunStatus.LOCKED,
                  PayrollRunStatus.APPROVED,
                ],
              },
            },
          },
          orderBy: [
            { payrollRun: { periodYear: 'desc' } },
            { payrollRun: { periodMonth: 'desc' } },
          ],
          include: { payrollRun: true },
        }),
        this.listBalances(emp),
        this.prisma.leaveRequest.count({
          where: {
            employeeId: emp.id,
            status: LeaveRequestStatus.PENDING,
          },
        }),
        this.listPayslips(emp, 3),
      ]);

    return {
      latestPayslip: latestEntry
        ? {
            payrollRunId: latestEntry.payrollRunId,
            periodYear: latestEntry.payrollRun.periodYear,
            periodMonth: latestEntry.payrollRun.periodMonth,
            periodLabel: periodLabel(
              latestEntry.payrollRun.periodYear,
              latestEntry.payrollRun.periodMonth,
            ),
            net: Number(latestEntry.net),
            gross: Number(latestEntry.gross),
            deductions: Number(latestEntry.deductions),
            status: latestEntry.payrollRun.status,
          }
        : null,
      leaveBalances: balances,
      pendingLeaveCount: pendingLeaves,
      recentPayslips,
    };
  }

  async getProfile(emp: LinkedEmployeeContext) {
    const [user, department, designation, tenant] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: emp.userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          phoneAlt: true,
          aadhar: true,
          pan: true,
        },
      }),
      emp.departmentId
        ? this.prisma.department.findUnique({
            where: { id: emp.departmentId },
            select: { name: true, code: true },
          })
        : null,
      emp.designationId
        ? this.prisma.designation.findUnique({
            where: { id: emp.designationId },
            select: { title: true, grade: true },
          })
        : null,
      this.prisma.tenant.findUnique({
        where: { id: emp.tenantId },
        select: { name: true, slug: true },
      }),
    ]);

    return {
      user,
      employee: {
        id: emp.id,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        status: emp.status,
        dateOfJoining: emp.dateOfJoining.toISOString().slice(0, 10),
        pan: emp.pan,
        bankAccount: emp.bankAccount,
        ifsc: emp.ifsc,
        department: department?.name ?? null,
        departmentCode: department?.code ?? null,
        designation: designation?.title ?? null,
        grade: designation?.grade ?? null,
      },
      companyName: tenant?.name ?? '',
      tenantSlug: tenant?.slug ?? '',
    };
  }

  async patchProfile(
    emp: LinkedEmployeeContext,
    body: { phone?: string; phoneAlt?: string },
  ) {
    await this.prisma.user.update({
      where: { id: emp.userId },
      data: {
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.phoneAlt !== undefined && { phoneAlt: body.phoneAlt || null }),
      },
    });
    return this.getProfile(emp);
  }

  async listPayslips(emp: LinkedEmployeeContext, limit = 48) {
    const entries = await this.prisma.payrollEntry.findMany({
      where: {
        employeeId: emp.id,
        payrollRun: {
          status: {
            in: [
              PayrollRunStatus.DISBURSED,
              PayrollRunStatus.LOCKED,
              PayrollRunStatus.APPROVED,
            ],
          },
        },
      },
      orderBy: [
        { payrollRun: { periodYear: 'desc' } },
        { payrollRun: { periodMonth: 'desc' } },
      ],
      take: Math.min(limit, 72),
      include: { payrollRun: true },
    });

    return entries.map((e) => ({
      payrollRunId: e.payrollRunId,
      periodYear: e.payrollRun.periodYear,
      periodMonth: e.payrollRun.periodMonth,
      periodLabel: periodLabel(e.payrollRun.periodYear, e.payrollRun.periodMonth),
      monthName: MONTHS[e.payrollRun.periodMonth - 1] ?? String(e.payrollRun.periodMonth),
      net: Number(e.net),
      gross: Number(e.gross),
      deductions: Number(e.deductions),
      status: e.payrollRun.status,
      hasPdf: true,
    }));
  }

  async getPayslipDetail(emp: LinkedEmployeeContext, payrollRunId: string) {
    const entry = await this.prisma.payrollEntry.findFirst({
      where: { employeeId: emp.id, payrollRunId },
      include: { payrollRun: true },
    });
    if (!entry) throw new NotFoundException('Payslip not found');

    const gross = Number(entry.gross);
    const deductionsTotal = Number(entry.deductions);
    const net = Number(entry.net);
    const { earnings, deductions } = splitPayslipBreakdown(
      entry.breakdown,
      gross,
      deductionsTotal,
    );

    const [department, designation, tenant] = await Promise.all([
      emp.departmentId
        ? this.prisma.department.findUnique({
            where: { id: emp.departmentId },
            select: { name: true, code: true },
          })
        : null,
      emp.designationId
        ? this.prisma.designation.findUnique({
            where: { id: emp.designationId },
            select: { title: true, grade: true },
          })
        : null,
      this.prisma.tenant.findUnique({
        where: { id: emp.tenantId },
        select: { name: true, slug: true },
      }),
    ]);

    const earningsTotal = earnings.reduce((s, l) => s + l.amount, 0);
    const deductionsDetailSum = deductions.reduce((s, l) => s + l.amount, 0);

    return {
      payrollRunId: entry.payrollRunId,
      periodYear: entry.payrollRun.periodYear,
      periodMonth: entry.payrollRun.periodMonth,
      periodLabel: periodLabel(
        entry.payrollRun.periodYear,
        entry.payrollRun.periodMonth,
      ),
      monthName: MONTHS[entry.payrollRun.periodMonth - 1] ?? String(entry.payrollRun.periodMonth),
      net,
      gross,
      deductions: deductionsTotal,
      earningsTotal,
      deductionsDetailSum,
      breakdown: entry.breakdown,
      earnings,
      deductionLines: deductions,
      status: entry.payrollRun.status,
      companyName: tenant?.name ?? '',
      tenantSlug: tenant?.slug ?? '',
      employee: {
        code: emp.employeeCode,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        dateOfJoining: emp.dateOfJoining.toISOString().slice(0, 10),
        designation: designation?.title ?? null,
        department: department?.name ?? null,
        grade: designation?.grade ?? null,
        pan: emp.pan,
        bankAccount: emp.bankAccount,
        ifsc: emp.ifsc,
      },
    };
  }

  async getPayslipPdfBuffer(
    emp: LinkedEmployeeContext,
    payrollRunId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const detail = await this.getPayslipDetail(emp, payrollRunId);
    const buf = await renderEmployeePayslipPdf({
      companyName: detail.companyName,
      periodLabel: detail.periodLabel,
      employeeName: detail.employee.name,
      employeeCode: detail.employee.code,
      dateOfJoining: detail.employee.dateOfJoining,
      designation: detail.employee.designation,
      department: detail.employee.department,
      grade: detail.employee.grade,
      pan: detail.employee.pan,
      bankAccount: detail.employee.bankAccount,
      ifsc: detail.employee.ifsc,
      earnings: detail.earnings,
      deductions: detail.deductionLines,
      gross: detail.gross,
      deductionsTotal: detail.deductions,
      net: detail.net,
    });
    const filename = `vetan-payslip-${detail.tenantSlug}-${detail.periodYear}-${String(detail.periodMonth).padStart(2, '0')}-${detail.employee.code}.pdf`.replace(
      /[^\w.\-]+/g,
      '_',
    );
    return { buffer: buf, filename };
  }

  async listBalances(emp: LinkedEmployeeContext) {
    const year = new Date().getFullYear();
    const rows = await this.prisma.leaveBalance.findMany({
      where: { employeeId: emp.id, year },
      include: { leaveType: { select: { id: true, name: true, code: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      leaveTypeId: r.leaveTypeId,
      leaveTypeName: r.leaveType.name,
      leaveTypeCode: r.leaveType.code,
      balanceDays: Number(r.balanceDays),
      year: r.year,
    }));
  }

  /** Merged platform + organization holiday calendar for employees. */
  async listHolidays(emp: LinkedEmployeeContext, year?: number) {
    const y = year ?? new Date().getUTCFullYear();
    const rows = await this.holidays.listEffectiveForTenant(emp.tenantId, {
      year: y,
    });
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      name: r.name,
      source: r.source,
    }));
  }

  async listLeaveTypes(tenantId: string) {
    return this.prisma.leaveType.findMany({
      where: { tenantId },
      select: { id: true, name: true, code: true, daysPerYear: true },
      orderBy: { name: 'asc' },
    });
  }

  async listLeaveRequests(emp: LinkedEmployeeContext, limit = 50) {
    const rows = await this.prisma.leaveRequest.findMany({
      where: { employeeId: emp.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      include: { leaveType: { select: { name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      leaveTypeId: r.leaveTypeId,
      leaveTypeName: r.leaveType.name,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      workingDays: Number(r.workingDays),
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createLeaveRequest(
    emp: LinkedEmployeeContext,
    body: {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      reason?: string;
    },
  ) {
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid dates');
    }
    if (end < start) {
      throw new BadRequestException('End date must be on or after start date');
    }

    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: body.leaveTypeId, tenantId: emp.tenantId },
    });
    if (!leaveType) throw new BadRequestException('Invalid leave type');

    const workingDays = workingDaysBetween(start, end);
    const year = start.getFullYear();
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: emp.id,
          leaveTypeId: body.leaveTypeId,
          year,
        },
      },
    });
    if (balance && Number(balance.balanceDays) < workingDays) {
      throw new BadRequestException(
        `Insufficient balance (${Number(balance.balanceDays)} days available)`,
      );
    }

    const row = await this.prisma.leaveRequest.create({
      data: {
        tenantId: emp.tenantId,
        employeeId: emp.id,
        leaveTypeId: body.leaveTypeId,
        startDate: start,
        endDate: end,
        workingDays,
        reason: body.reason?.trim() || null,
        status: LeaveRequestStatus.PENDING,
      },
      include: { leaveType: { select: { name: true } } },
    });

    return {
      id: row.id,
      leaveTypeName: row.leaveType.name,
      startDate: row.startDate.toISOString().slice(0, 10),
      endDate: row.endDate.toISOString().slice(0, 10),
      workingDays: Number(row.workingDays),
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async cancelLeaveRequest(emp: LinkedEmployeeContext, id: string) {
    const row = await this.prisma.leaveRequest.findFirst({
      where: { id, employeeId: emp.id },
    });
    if (!row) throw new NotFoundException('Leave request not found');
    if (row.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }
    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveRequestStatus.CANCELLED },
      include: { leaveType: { select: { name: true } } },
    });
    return {
      id: updated.id,
      leaveTypeName: updated.leaveType.name,
      startDate: updated.startDate.toISOString().slice(0, 10),
      endDate: updated.endDate.toISOString().slice(0, 10),
      workingDays: Number(updated.workingDays),
      reason: updated.reason,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async getAttendanceMonth(
    emp: LinkedEmployeeContext,
    year: number,
    month: number,
  ) {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const last = new Date(Date.UTC(year, month, 0));

    const [records, holidays] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: first, lte: last },
        },
      }),
      this.holidays.listEffectiveForTenant(emp.tenantId, { year }),
    ]);

    const recordByDate = new Map(
      records.map((r) => [r.date.toISOString().slice(0, 10), r]),
    );
    const holidayByDate = new Map(
      holidays.map((h) => [h.date, { date: h.date, name: h.name }]),
    );

    type RawDetail = Record<string, unknown> | null;
    const days: {
      date: string;
      dayOfMonth: number;
      weekday: number;
      status: string;
      calendarCode: string;
      checkIn: string | null;
      checkOut: string | null;
      remarks: string | null;
      source: string;
      detail: RawDetail;
      isHoliday: boolean;
      holidayName: string | null;
      isWeekend: boolean;
      needsRegularization: boolean;
    }[] = [];

    let exceptionDays = 0;
    let penaltyDays = 0;
    const lastDay = last.getUTCDate();

    for (let d = 1; d <= lastDay; d++) {
      const cur = new Date(Date.UTC(year, month - 1, d));
      const dateStr = cur.toISOString().slice(0, 10);
      const weekday = cur.getUTCDay();
      const isWeekend = weekday === 0 || weekday === 6;
      const hol = holidayByDate.get(dateStr);
      const rec = recordByDate.get(dateStr);

      let calendarCode: string;
      let statusOut: string;
      let needsRegularization = false;

      if (isWeekend) {
        calendarCode = '-';
        statusOut = 'WEEKEND';
      } else if (hol) {
        calendarCode = 'O';
        statusOut = 'HOLIDAY';
      } else if (rec) {
        const s = rec.status.toUpperCase();
        if (s === 'ABSENT') {
          calendarCode = 'A';
          statusOut = 'ABSENT';
          needsRegularization = true;
        } else if (s === 'LATE') {
          calendarCode = 'L';
          statusOut = 'LATE';
          penaltyDays += 1;
        } else if (s === 'WFH') {
          calendarCode = 'P';
          statusOut = 'WFH';
        } else {
          calendarCode = 'P';
          statusOut = 'PRESENT';
        }
        if (
          (statusOut === 'PRESENT' ||
            statusOut === 'LATE' ||
            statusOut === 'WFH') &&
          (!rec.checkIn || !rec.checkOut)
        ) {
          needsRegularization = true;
        }
      } else {
        calendarCode = 'A';
        statusOut = 'ABSENT';
        needsRegularization = true;
      }

      if (needsRegularization && !isWeekend && !hol) {
        exceptionDays += 1;
      }

      days.push({
        date: dateStr,
        dayOfMonth: d,
        weekday,
        status: statusOut,
        calendarCode,
        checkIn: rec?.checkIn?.toISOString() ?? null,
        checkOut: rec?.checkOut?.toISOString() ?? null,
        remarks: rec?.remarks ?? null,
        source: rec?.source ?? 'manual',
        detail: (rec?.detail as RawDetail) ?? null,
        isHoliday: !!hol,
        holidayName: hol?.name ?? null,
        isWeekend,
        needsRegularization,
      });
    }

    return {
      year,
      month,
      monthLabel: `${SHORT_MONTHS[month - 1] ?? month} ${year}`,
      defaultShift: {
        code: 'GS',
        name: 'General Shift',
        start: '10:00',
        end: '18:00',
        breakMinutes: 30,
      },
      exceptionDays,
      penaltyDays,
      insightsCount: 3,
      days,
    };
  }

  async listAttendance(
    emp: LinkedEmployeeContext,
    opts?: { from?: string; to?: string; limit?: number },
  ) {
    const where: { employeeId: string; date?: { gte?: Date; lte?: Date } } = {
      employeeId: emp.id,
    };
    if (opts?.from) where.date = { ...where.date, gte: new Date(opts.from) };
    if (opts?.to) where.date = { ...where.date, lte: new Date(opts.to) };

    const rows = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      take: Math.min(opts?.limit ?? 60, 200),
    });

    return rows.map((r) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      status: r.status,
      checkIn: r.checkIn?.toISOString() ?? null,
      checkOut: r.checkOut?.toISOString() ?? null,
      remarks: r.remarks ?? null,
      source: r.source ?? 'manual',
      detail: r.detail ?? null,
    }));
  }

  async attendanceSummary(emp: LinkedEmployeeContext, from: string, to: string) {
    const rows = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId: emp.id,
        date: { gte: new Date(from), lte: new Date(to) },
      },
      select: { status: true },
    });
    const counts = { present: 0, absent: 0, late: 0, wfh: 0 };
    for (const r of rows) {
      const s = r.status.toUpperCase();
      if (s === 'PRESENT') counts.present++;
      else if (s === 'ABSENT') counts.absent++;
      else if (s === 'LATE') counts.late++;
      else if (s === 'WFH') counts.wfh++;
    }
    return { ...counts, totalRecords: rows.length };
  }

  async listNotifications(userId: string, tenantId: string, limit = 30) {
    const rows = await this.prisma.notification.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    });
    return rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }));
  }
}
