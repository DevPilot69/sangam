import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateHolidaysDto } from '../dto/create-holidays.dto';
import { ListHolidaysQueryDto } from '../dto/list-holidays.query.dto';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';
import { parseISODateOnly } from './date-parse';

const holSelect = {
  id: true,
  date: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type HolidayRowDto = {
  id: string;
  date: string;
  name: string;
  source: 'platform' | 'tenant';
  createdAt: string;
  updatedAt: string;
};

function yearDateRange(year: number) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lte: new Date(Date.UTC(year, 11, 31)),
  };
}

@Injectable()
export class HolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  /** Merged calendar: platform defaults + tenant-specific (tenant wins on same date). */
  async listEffectiveForTenant(
    tenantId: string,
    query: ListHolidaysQueryDto,
  ): Promise<HolidayRowDto[]> {
    const year = query.year ?? new Date().getUTCFullYear();
    const range = yearDateRange(year);

    const [platformRows, tenantRows] = await Promise.all([
      this.prisma.platformHoliday.findMany({
        where: { date: range },
        orderBy: { date: 'asc' },
        select: holSelect,
      }),
      this.prisma.tenantHoliday.findMany({
        where: { tenantId, date: range },
        orderBy: { date: 'asc' },
        select: holSelect,
      }),
    ]);

    const byDate = new Map<string, HolidayRowDto>();

    for (const r of platformRows) {
      const date = r.date.toISOString().slice(0, 10);
      byDate.set(date, {
        id: r.id,
        date,
        name: r.name,
        source: 'platform',
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      });
    }

    for (const r of tenantRows) {
      const date = r.date.toISOString().slice(0, 10);
      byDate.set(date, {
        id: r.id,
        date,
        name: r.name,
        source: 'tenant',
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      });
    }

    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Tenant-only rows (for admin editing). */
  async listTenantOnly(tenantId: string, query: ListHolidaysQueryDto) {
    const year = query.year;
    const rows = await this.prisma.tenantHoliday.findMany({
      where: {
        tenantId,
        ...(year !== undefined ? { date: yearDateRange(year) } : {}),
      },
      orderBy: { date: 'asc' },
      select: holSelect,
    });
    return rows.map((r) => ({
      ...r,
      date: r.date.toISOString().slice(0, 10),
      source: 'tenant' as const,
    }));
  }

  async list(tenantId: string, query: ListHolidaysQueryDto) {
    return this.listEffectiveForTenant(tenantId, query);
  }

  async listPlatform(query: ListHolidaysQueryDto) {
    const year = query.year;
    const rows = await this.prisma.platformHoliday.findMany({
      where: {
        ...(year !== undefined ? { date: yearDateRange(year) } : {}),
      },
      orderBy: { date: 'asc' },
      select: holSelect,
    });
    return rows.map((r) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      name: r.name,
      source: 'platform' as const,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async upsertMany(tenantId: string, dto: CreateHolidaysDto) {
    const results = [];
    for (const h of dto.holidays) {
      const date = parseISODateOnly(h.date);
      const name = h.name.trim();
      const row = await this.prisma.tenantHoliday.upsert({
        where: {
          tenantId_date: { tenantId, date },
        },
        create: { tenantId, date, name },
        update: { name },
        select: holSelect,
      });
      results.push({
        ...row,
        date: row.date.toISOString().slice(0, 10),
        source: 'tenant' as const,
      });
    }
    return { upserted: results.length, holidays: results };
  }

  async upsertManyPlatform(dto: CreateHolidaysDto) {
    const results = [];
    for (const h of dto.holidays) {
      const date = parseISODateOnly(h.date);
      const name = h.name.trim();
      const row = await this.prisma.platformHoliday.upsert({
        where: { date },
        create: { date, name },
        update: { name },
        select: holSelect,
      });
      results.push({
        ...row,
        date: row.date.toISOString().slice(0, 10),
        source: 'platform' as const,
      });
    }
    return { upserted: results.length, holidays: results };
  }

  async update(tenantId: string, id: string, dto: UpdateHolidayDto) {
    if (dto.date === undefined && dto.name === undefined) {
      throw new BadRequestException('Provide at least one of date, name');
    }

    const row = await this.requireTenantHoliday(tenantId, id);

    let nextDate = row.date;
    if (dto.date !== undefined) {
      nextDate = parseISODateOnly(dto.date);
    }
    const nextName = dto.name !== undefined ? dto.name.trim() : row.name;

    if (dto.date !== undefined && nextDate.getTime() !== row.date.getTime()) {
      const clash = await this.prisma.tenantHoliday.findUnique({
        where: { tenantId_date: { tenantId, date: nextDate } },
      });
      if (clash && clash.id !== row.id) {
        throw new BadRequestException(
          'Another holiday already exists on that date',
        );
      }
    }

    const updated = await this.prisma.tenantHoliday.update({
      where: { id: row.id },
      data: {
        ...(dto.date !== undefined && { date: nextDate }),
        ...(dto.name !== undefined && { name: nextName }),
      },
      select: holSelect,
    });
    return {
      ...updated,
      date: updated.date.toISOString().slice(0, 10),
      source: 'tenant' as const,
    };
  }

  async updatePlatform(id: string, dto: UpdateHolidayDto) {
    if (dto.date === undefined && dto.name === undefined) {
      throw new BadRequestException('Provide at least one of date, name');
    }

    const row = await this.requirePlatformHoliday(id);

    let nextDate = row.date;
    if (dto.date !== undefined) {
      nextDate = parseISODateOnly(dto.date);
    }
    const nextName = dto.name !== undefined ? dto.name.trim() : row.name;

    if (dto.date !== undefined && nextDate.getTime() !== row.date.getTime()) {
      const clash = await this.prisma.platformHoliday.findUnique({
        where: { date: nextDate },
      });
      if (clash && clash.id !== row.id) {
        throw new BadRequestException(
          'Another platform holiday already exists on that date',
        );
      }
    }

    const updated = await this.prisma.platformHoliday.update({
      where: { id: row.id },
      data: {
        ...(dto.date !== undefined && { date: nextDate }),
        ...(dto.name !== undefined && { name: nextName }),
      },
      select: holSelect,
    });
    return {
      ...updated,
      date: updated.date.toISOString().slice(0, 10),
      source: 'platform' as const,
    };
  }

  async remove(tenantId: string, id: string) {
    const row = await this.requireTenantHoliday(tenantId, id);
    await this.prisma.tenantHoliday.delete({ where: { id: row.id } });
    return { id: row.id, deleted: true };
  }

  async removePlatform(id: string) {
    const row = await this.requirePlatformHoliday(id);
    await this.prisma.platformHoliday.delete({ where: { id: row.id } });
    return { id: row.id, deleted: true };
  }

  private async requireTenantHoliday(tenantId: string, id: string) {
    const row = await this.prisma.tenantHoliday.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Holiday not found');
    return row;
  }

  private async requirePlatformHoliday(id: string) {
    const row = await this.prisma.platformHoliday.findFirst({
      where: { id },
    });
    if (!row) throw new NotFoundException('Platform holiday not found');
    return row;
  }
}
