import { prisma, LeaveRequestStatus } from "@sangam/db";
import { BadRequestError, NotFoundError } from "@sangam/api-kit";

/**
 * Leave service — ported from src/modules/leave/leave.service.ts.
 *
 * Tenant-scoped CRUD over LeaveRequest + LeaveBalance with a state-machine
 * transition (PENDING -> APPROVED|REJECTED).
 *
 * Behavioural fidelity:
 *   - Same response shape as Nest: ISO date strings for dates, numeric
 *     workingDays, joined employee name field.
 *   - Status transitions only allowed from PENDING (matches the original
 *     "Only pending requests can be updated" guard).
 *   - Default list page size 50, capped at 200.
 */

export type ListLeaveOptions = {
  status?: LeaveRequestStatus;
  limit?: number;
};

export async function listRequests(
  tenantId: string,
  opts?: ListLeaveOptions,
) {
  const rows = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      ...(opts?.status && { status: opts.status }),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts?.limit ?? 50, 200),
    include: {
      employee: {
        select: { employeeCode: true, firstName: true, lastName: true },
      },
      leaveType: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: `${r.employee.firstName} ${r.employee.lastName}`.trim(),
    employeeCode: r.employee.employeeCode,
    leaveTypeName: r.leaveType.name,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate.toISOString().slice(0, 10),
    workingDays: Number(r.workingDays),
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listBalances(tenantId: string) {
  const rows = await prisma.leaveBalance.findMany({
    where: { employee: { tenantId, deletedAt: null } },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      employee: { select: { firstName: true, lastName: true } },
      leaveType: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: `${r.employee.firstName} ${r.employee.lastName}`.trim(),
    leaveTypeName: r.leaveType.name,
    balanceDays: Number(r.balanceDays),
    year: r.year,
  }));
}

export async function updateRequestStatus(
  tenantId: string,
  id: string,
  status: "APPROVED" | "REJECTED",
) {
  if (status !== "APPROVED" && status !== "REJECTED") {
    throw new BadRequestError("Invalid status");
  }
  const row = await prisma.leaveRequest.findFirst({
    where: { id, tenantId },
  });
  if (!row) throw new NotFoundError("Leave request not found");
  if (row.status !== LeaveRequestStatus.PENDING) {
    throw new BadRequestError("Only pending requests can be updated");
  }
  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status:
        status === "APPROVED"
          ? LeaveRequestStatus.APPROVED
          : LeaveRequestStatus.REJECTED,
    },
    include: {
      employee: {
        select: { employeeCode: true, firstName: true, lastName: true },
      },
      leaveType: { select: { name: true } },
    },
  });
  return {
    id: updated.id,
    employeeId: updated.employeeId,
    employeeName:
      `${updated.employee.firstName} ${updated.employee.lastName}`.trim(),
    employeeCode: updated.employee.employeeCode,
    leaveTypeName: updated.leaveType.name,
    startDate: updated.startDate.toISOString().slice(0, 10),
    endDate: updated.endDate.toISOString().slice(0, 10),
    workingDays: Number(updated.workingDays),
    reason: updated.reason,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
  };
}
