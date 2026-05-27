import { prisma, Prisma } from "@sangam/db";
import {
  listSelectableAttendanceMonths,
  resolveAttendanceDateRange,
  type AttendanceListQuery,
} from "./attendance-query";

/**
 * Attendance service — ported from
 * src/modules/attendance/attendance.service.ts (NestJS).
 *
 * Two endpoints:
 *  - list  : tenant-scoped record listing with date/preset/status filters
 *  - summary: PRESENT / ABSENT / LATE / WFH counts for the same window
 *
 * Date-range resolution is delegated to the shared `attendance-query` util so
 * both endpoints see exactly the same window.
 */

export function getMonthOptions() {
  return { months: listSelectableAttendanceMonths() };
}

function buildWhere(
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
                  mode: "insensitive",
                },
              },
              {
                firstName: { contains: search, mode: "insensitive" },
              },
              {
                lastName: { contains: search, mode: "insensitive" },
              },
            ],
          },
        }
      : {}),
  };
}

export async function list(tenantId: string, opts?: AttendanceListQuery) {
  const { from, to } = resolveAttendanceDateRange(opts);
  const where = buildWhere(tenantId, from, to, opts);

  const rows = await prisma.attendanceRecord.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
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
    source: r.source ?? "manual",
    detail: r.detail ?? null,
  }));
}

export async function summary(
  tenantId: string,
  opts?: AttendanceListQuery,
) {
  const { from, to } = resolveAttendanceDateRange(opts);
  const where = buildWhere(tenantId, from, to, opts);

  const rows = await prisma.attendanceRecord.findMany({
    where,
    select: { status: true },
  });
  const counts = { present: 0, absent: 0, late: 0, wfh: 0 };
  for (const r of rows) {
    const s = r.status.toUpperCase();
    if (s === "PRESENT") counts.present++;
    else if (s === "ABSENT") counts.absent++;
    else if (s === "LATE") counts.late++;
    else if (s === "WFH") counts.wfh++;
  }
  return {
    ...counts,
    totalRecords: rows.length,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
