import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDesignationDto } from '../dto/create-designation.dto';
import { UpdateDesignationDto } from '../dto/update-designation.dto';

const desSelect = {
  id: true,
  title: true,
  grade: true,
  departmentId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class DesignationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.designation.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { title: 'asc' },
      select: desSelect,
    });
  }

  async create(tenantId: string, dto: CreateDesignationDto) {
    if (dto.departmentId) {
      await this.assertDepartmentInTenant(tenantId, dto.departmentId);
    }

    return this.prisma.designation.create({
      data: {
        tenantId,
        title: dto.title.trim(),
        grade: dto.grade?.trim() || null,
        departmentId: dto.departmentId ?? null,
      },
      select: desSelect,
    });
  }

  async update(tenantId: string, id: string, dto: UpdateDesignationDto) {
    const row = await this.requireDesignation(tenantId, id);

    if (dto.departmentId !== undefined && dto.departmentId !== null) {
      await this.assertDepartmentInTenant(tenantId, dto.departmentId);
    }

    return this.prisma.designation.update({
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

  async remove(tenantId: string, id: string) {
    const row = await this.requireDesignation(tenantId, id);
    return this.prisma.designation.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
      select: { ...desSelect, deletedAt: true },
    });
  }

  private async requireDesignation(tenantId: string, id: string) {
    const row = await this.prisma.designation.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Designation not found');
    return row;
  }

  private async assertDepartmentInTenant(
    tenantId: string,
    departmentId: string,
  ) {
    const dept = await this.prisma.department.findFirst({
      where: { id: departmentId, tenantId, deletedAt: null },
    });
    if (!dept) {
      throw new BadRequestException(
        'departmentId must be an active department in this workspace',
      );
    }
  }
}
