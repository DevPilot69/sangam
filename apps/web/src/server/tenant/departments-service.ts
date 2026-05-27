import { prisma } from "@sangam/db";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@sangam/api-kit";
import type { Tenant } from "@sangam/contracts";

const deptSelect = {
  id: true,
  name: true,
  code: true,
  headUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function requireDepartment(tenantId: string, id: string) {
  const row = await prisma.department.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!row) throw new NotFoundError("Department not found");
  return row;
}

async function assertHeadUserInTenant(tenantId: string, headUserId?: string) {
  if (!headUserId) return;
  const user = await prisma.user.findFirst({
    where: { id: headUserId, tenantId, deletedAt: null },
  });
  if (!user) {
    throw new BadRequestError(
      "headUserId must be an active user in this workspace",
    );
  }
}

export function list(tenantId: string) {
  return prisma.department.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { name: "asc" },
    select: deptSelect,
  });
}

export async function create(
  tenantId: string,
  dto: Tenant.CreateDepartmentDto,
) {
  const code = dto.code.trim().toUpperCase();
  await assertHeadUserInTenant(tenantId, dto.headUserId);

  const existing = await prisma.department.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  if (existing) {
    if (existing.deletedAt) {
      throw new ConflictError("Code is reserved by an archived department");
    }
    throw new ConflictError("Department code already in use");
  }

  return prisma.department.create({
    data: {
      tenantId,
      name: dto.name.trim(),
      code,
      headUserId: dto.headUserId ?? null,
    },
    select: deptSelect,
  });
}

export async function update(
  tenantId: string,
  id: string,
  dto: Tenant.UpdateDepartmentDto,
) {
  const row = await requireDepartment(tenantId, id);

  if (dto.headUserId !== undefined) {
    await assertHeadUserInTenant(tenantId, dto.headUserId ?? undefined);
  }

  let code = row.code;
  if (dto.code !== undefined) {
    code = dto.code.trim().toUpperCase();
    if (code !== row.code) {
      const existing = await prisma.department.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });
      if (existing) {
        if (existing.deletedAt) {
          throw new ConflictError("Code is reserved by an archived department");
        }
        throw new ConflictError("Department code already in use");
      }
    }
  }

  return prisma.department.update({
    where: { id: row.id },
    data: {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.code !== undefined && { code }),
      ...(dto.headUserId !== undefined && { headUserId: dto.headUserId }),
    },
    select: deptSelect,
  });
}

export async function remove(tenantId: string, id: string) {
  const row = await requireDepartment(tenantId, id);
  return prisma.department.update({
    where: { id: row.id },
    data: { deletedAt: new Date() },
    select: { ...deptSelect, deletedAt: true },
  });
}
