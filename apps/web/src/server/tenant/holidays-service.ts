import { prisma } from "@sangam/db";
import { BadRequestError, NotFoundError } from "@sangam/api-kit";
import type { Tenant } from "@sangam/contracts";
import { parseISODateOnly } from "../shared/date-parse";

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
  source: "platform" | "tenant";
  createdAt: string;
  updatedAt: string;
};

function yearDateRange(year: number) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lte: new Date(Date.UTC(year, 11, 31)),
  };
}

/** Merged calendar: platform defaults + tenant-specific (tenant wins on same date). */
export async function listEffectiveForTenant(
  tenantId: string,
  query: Tenant.ListHolidaysQueryDto,
): Promise<HolidayRowDto[]> {
  const year = query.year ?? new Date().getUTCFullYear();
  const range = yearDateRange(year);

  const [platformRows, tenantRows] = await Promise.all([
    prisma.platformHoliday.findMany({
      where: { date: range },
      orderBy: { date: "asc" },
      select: holSelect,
    }),
    prisma.tenantHoliday.findMany({
      where: { tenantId, date: range },
      orderBy: { date: "asc" },
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
      source: "platform",
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
      source: "tenant",
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    });
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Tenant-only rows (for admin editing). */
export async function listTenantOnly(
  tenantId: string,
  query: Tenant.ListHolidaysQueryDto,
) {
  const year = query.year;
  const rows = await prisma.tenantHoliday.findMany({
    where: {
      tenantId,
      ...(year !== undefined ? { date: yearDateRange(year) } : {}),
    },
    orderBy: { date: "asc" },
    select: holSelect,
  });
  return rows.map((r) => ({
    ...r,
    date: r.date.toISOString().slice(0, 10),
    source: "tenant" as const,
  }));
}

export function list(tenantId: string, query: Tenant.ListHolidaysQueryDto) {
  return listEffectiveForTenant(tenantId, query);
}

export async function listPlatform(query: Tenant.ListHolidaysQueryDto) {
  const year = query.year;
  const rows = await prisma.platformHoliday.findMany({
    where: {
      ...(year !== undefined ? { date: yearDateRange(year) } : {}),
    },
    orderBy: { date: "asc" },
    select: holSelect,
  });
  return rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    name: r.name,
    source: "platform" as const,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function upsertMany(
  tenantId: string,
  dto: Tenant.CreateHolidaysDto,
) {
  const results = [];
  for (const h of dto.holidays) {
    const date = parseISODateOnly(h.date);
    const name = h.name.trim();
    const row = await prisma.tenantHoliday.upsert({
      where: { tenantId_date: { tenantId, date } },
      create: { tenantId, date, name },
      update: { name },
      select: holSelect,
    });
    results.push({
      ...row,
      date: row.date.toISOString().slice(0, 10),
      source: "tenant" as const,
    });
  }
  return { upserted: results.length, holidays: results };
}

export async function upsertManyPlatform(dto: Tenant.CreateHolidaysDto) {
  const results = [];
  for (const h of dto.holidays) {
    const date = parseISODateOnly(h.date);
    const name = h.name.trim();
    const row = await prisma.platformHoliday.upsert({
      where: { date },
      create: { date, name },
      update: { name },
      select: holSelect,
    });
    results.push({
      ...row,
      date: row.date.toISOString().slice(0, 10),
      source: "platform" as const,
    });
  }
  return { upserted: results.length, holidays: results };
}

async function requireTenantHoliday(tenantId: string, id: string) {
  const row = await prisma.tenantHoliday.findFirst({
    where: { id, tenantId },
  });
  if (!row) throw new NotFoundError("Holiday not found");
  return row;
}

async function requirePlatformHoliday(id: string) {
  const row = await prisma.platformHoliday.findFirst({ where: { id } });
  if (!row) throw new NotFoundError("Platform holiday not found");
  return row;
}

export async function update(
  tenantId: string,
  id: string,
  dto: Tenant.UpdateHolidayDto,
) {
  if (dto.date === undefined && dto.name === undefined) {
    throw new BadRequestError("Provide at least one of date, name");
  }

  const row = await requireTenantHoliday(tenantId, id);

  let nextDate = row.date;
  if (dto.date !== undefined) {
    nextDate = parseISODateOnly(dto.date);
  }
  const nextName = dto.name !== undefined ? dto.name.trim() : row.name;

  if (dto.date !== undefined && nextDate.getTime() !== row.date.getTime()) {
    const clash = await prisma.tenantHoliday.findUnique({
      where: { tenantId_date: { tenantId, date: nextDate } },
    });
    if (clash && clash.id !== row.id) {
      throw new BadRequestError("Another holiday already exists on that date");
    }
  }

  const updated = await prisma.tenantHoliday.update({
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
    source: "tenant" as const,
  };
}

export async function updatePlatform(id: string, dto: Tenant.UpdateHolidayDto) {
  if (dto.date === undefined && dto.name === undefined) {
    throw new BadRequestError("Provide at least one of date, name");
  }

  const row = await requirePlatformHoliday(id);

  let nextDate = row.date;
  if (dto.date !== undefined) {
    nextDate = parseISODateOnly(dto.date);
  }
  const nextName = dto.name !== undefined ? dto.name.trim() : row.name;

  if (dto.date !== undefined && nextDate.getTime() !== row.date.getTime()) {
    const clash = await prisma.platformHoliday.findUnique({
      where: { date: nextDate },
    });
    if (clash && clash.id !== row.id) {
      throw new BadRequestError(
        "Another platform holiday already exists on that date",
      );
    }
  }

  const updated = await prisma.platformHoliday.update({
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
    source: "platform" as const,
  };
}

export async function remove(tenantId: string, id: string) {
  const row = await requireTenantHoliday(tenantId, id);
  await prisma.tenantHoliday.delete({ where: { id: row.id } });
  return { id: row.id, deleted: true };
}

export async function removePlatform(id: string) {
  const row = await requirePlatformHoliday(id);
  await prisma.platformHoliday.delete({ where: { id: row.id } });
  return { id: row.id, deleted: true };
}
