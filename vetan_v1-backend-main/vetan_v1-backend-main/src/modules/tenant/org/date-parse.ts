import { BadRequestException } from '@nestjs/common';

/** Parse YYYY-MM-DD as a UTC calendar date (Prisma @db.Date). */
export function parseISODateOnly(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) throw new BadRequestException('Invalid date');
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo ||
    dt.getUTCDate() !== d
  ) {
    throw new BadRequestException('Invalid date');
  }
  return dt;
}
