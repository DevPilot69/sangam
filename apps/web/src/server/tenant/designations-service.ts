import { prisma } from "@sangam/db";
import { BadRequestError, NotFoundError } from "@sangam/api-kit";
import type { Tenant } from "@sangam/contracts";

const desSelect = {
  id: true,
  title: true,
  grade: true,
  departmentId: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function requireDesignation(tenantId: string, id: string) {
  const row = await prisma.designation.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!row) throw new NotFoundError("Designation not found");
  return row;
}

async function assertDepartmentInTenant(
  tenantId: string,
  departmentId: string,
) {
  const dept = await prisma.department.findFirst({
    where: { id: departmentId, tenantId, deletedAt: null },
  });
  if (!dept) {
    throw new BadRequestError(
      "departmentId must be an active department in this workspace",
    );
  }
}

export function list(tenantId: string) {
  return prisma.designation.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { title: "asc" },
    select: desSelect,
  });
}

export async function create(
  tenantId: string,
  dto: Tenant.CreateDesignationDto,
) {
  if (dto.departmentId) {
    await assertDepartmentInTenant(tenantId, dto.departmentId);
  }

  return prisma.designation.create({
    data: {
      tenantId,
      title: dto.title.trim(),
      grade: dto.grade?.trim() || null,
      departmentId: dto.departmentId ?? null,
    },
    select: desSelect,
  });
}

export async function update(
  tenantId: string,
  id: string,
  dto: Tenant.UpdateDesignationDto,
) {
  const row = await requireDesignation(tenantId, id);

  if (dto.departmentId !== undefined && dto.departmentId !== null) {
    await assertDepartmentInTenant(tenantId, dto.departmentId);
  }

  return prisma.designation.update({
    where: { id: row.id },
    data: {
      ...(dto.title !== undefined && { title: dto.title.trim() }),
      ...(dto.grade !== undefined && {
        grade: dto.grade === null ? null : dto.grade.trim(),
      }),
      ...(dto.departmentId !== undefined && {
        departmentId: dto.departmentId,
      }),
    },
    select: desSelect,
  });
}

export async function remove(tenantId: string, id: string) {
  const row = await requireDesignation(tenantId, id);
  return prisma.designation.update({
    where: { id: row.id },
    data: { deletedAt: new Date() },
    select: { ...desSelect, deletedAt: true },
  });
}
