import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  listSelectableAttendanceMonths,
  resolveAttendanceDateRange,
  type AttendanceListQuery,
} from './attendance-query.util';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  getMonthOptions() {
    return { months: listSelectableAttendanceMonths() };
  }

  private buildWhere(
    tenantId: string,
    from: Date,
    to: Date,
    opts?: AttendanceListQuery,
  ): Prisma.AttendanceRecordWhereInput {
    const search = opts?.search?.trim();
    return {
      tenantId,
      date: { gte: from, lte: to },
      ...(opts?.employeeId ? { employeeId: opts.employeeId } : {}),
      ...(opts?.status ? { status: opts.status } : {}),
      ...(search
        ? {
            employee: {
              OR: [
                {
                  employeeCode: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  firstName: { contains: search, mode: 'insensitive' },
                },
                {
                  lastName: { contains: search, mode: 'insensitive' },
                },
              ],
            },
          }
        : {}),
    };
  }

  async list(tenantId: string, opts?: AttendanceListQuery) {
    const { from, to } = resolveAttendanceDateRange(opts);
    const where = this.buildWhere(tenantId, from, to, opts);

    const rows = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(opts?.limit ?? 100, 500),
      include: {
        employee: {
          select: { employeeCode: true, firstName: true, lastName: true },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`.trim(),
      employeeCode: r.employee.employeeCode,
      date: r.date.toISOString().slice(0, 10),
      status: r.status,
      checkIn: r.checkIn?.toISOString() ?? null,
      checkOut: r.checkOut?.toISOString() ?? null,
      remarks: r.remarks ?? null,
      source: r.source ?? 'manual',
      detail: r.detail ?? null,
    }));
  }

  async summary(tenantId: string, opts?: AttendanceListQuery) {
    const { from, to } = resolveAttendanceDateRange(opts);
    const where = this.buildWhere(tenantId, from, to, opts);

    const rows = await this.prisma.attendanceRecord.findMany({
      where,
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
    return {
      ...counts,
      totalRecords: rows.length,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }
}
