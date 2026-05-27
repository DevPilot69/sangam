import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRequestStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async listRequests(
    tenantId: string,
    opts?: { status?: LeaveRequestStatus; limit?: number },
  ) {
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        ...(opts?.status && { status: opts.status }),
      },
      orderBy: { createdAt: 'desc' },
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

  async listBalances(tenantId: string) {
    const rows = await this.prisma.leaveBalance.findMany({
      where: { employee: { tenantId, deletedAt: null } },
      orderBy: { updatedAt: 'desc' },
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

  async updateRequestStatus(
    tenantId: string,
    id: string,
    status: 'APPROVED' | 'REJECTED',
  ) {
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      throw new BadRequestException('Invalid status');
    }
    const row = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Leave request not found');
    if (row.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be updated');
    }
    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status:
          status === 'APPROVED'
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
      employeeName: `${updated.employee.firstName} ${updated.employee.lastName}`.trim(),
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
}
