import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';

const deptSelect = {
  id: true,
  name: true,
  code: true,
  headUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: deptSelect,
    });
  }

  async create(tenantId: string, dto: CreateDepartmentDto) {
    const code = dto.code.trim().toUpperCase();
    await this.assertHeadUserInTenant(tenantId, dto.headUserId);

    const existing = await this.prisma.department.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (existing) {
      if (existing.deletedAt) {
        throw new ConflictException(
          'Code is reserved by an archived department',
        );
      }
      throw new ConflictException('Department code already in use');
    }

    return this.prisma.department.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        code,
        headUserId: dto.headUserId ?? null,
      },
      select: deptSelect,
    });
  }

  async update(tenantId: string, id: string, dto: UpdateDepartmentDto) {
    const row = await this.requireDepartment(tenantId, id);

    if (dto.headUserId !== undefined) {
      await this.assertHeadUserInTenant(tenantId, dto.headUserId ?? undefined);
    }

    let code = row.code;
    if (dto.code !== undefined) {
      code = dto.code.trim().toUpperCase();
      if (code !== row.code) {
        const existing = await this.prisma.department.findUnique({
          where: { tenantId_code: { tenantId, code } },
        });
        if (existing) {
          if (existing.deletedAt) {
            throw new ConflictException(
              'Code is reserved by an archived department',
            );
          }
          throw new ConflictException('Department code already in use');
        }
      }
    }

    return this.prisma.department.update({
      where: { id: row.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.code !== undefined && { code }),
        ...(dto.headUserId !== undefined && { headUserId: dto.headUserId }),
      },
      select: deptSelect,
    });
  }

  async remove(tenantId: string, id: string) {
    const row = await this.requireDepartment(tenantId, id);
    return this.prisma.department.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
      select: { ...deptSelect, deletedAt: true },
    });
  }

  private async requireDepartment(tenantId: string, id: string) {
    const row = await this.prisma.department.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Department not found');
    return row;
  }

  private async assertHeadUserInTenant(tenantId: string, headUserId?: string) {
    if (!headUserId) return;
    const user = await this.prisma.user.findFirst({
      where: { id: headUserId, tenantId, deletedAt: null },
    });
    if (!user) {
      throw new BadRequestException(
        'headUserId must be an active user in this workspace',
      );
    }
  }
}
