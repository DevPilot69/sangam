import { BadRequestError } from "@sangam/api-kit";

/**
 * Attendance query helpers — ported from
 * src/modules/attendance/attendance-query.util.ts (NestJS).
 *
 * Centralises date-window resolution so list and summary endpoints stay in
 * lockstep. Enforces the 3-month look-back guard (we do not want serverless
 * functions sweeping arbitrary historical ranges).
 */

export type AttendancePreset =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "range";

export type AttendanceStatusFilter = "PRESENT" | "ABSENT" | "LATE" | "WFH";

export type AttendanceListQuery = {
  from?: string;
  to?: string;
  limit?: number;
  employeeId?: string;
  search?: string;
  date?: string;
  preset?: AttendancePreset;
  month?: string;
  status?: AttendanceStatusFilter;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseYmd(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new BadRequestError("Invalid date; use YYYY-MM-DD");
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestError("Invalid date");
  }
  return d;
}

function parseMonthYm(s: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) throw new BadRequestError("Invalid month; use YYYY-MM");
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  if (month < 0 || month > 11) {
    throw new BadRequestError("Invalid month");
  }
  const start = new Date(year, month, 1);
  const end = endOfDay(new Date(year, month + 1, 0));
  return { start, end };
}

function assertMonthWithinLastThreeMonths(monthYm: string): void {
  const { start } = parseMonthYm(monthYm);
  const now = new Date();
  const earliest = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  earliest.setHours(0, 0, 0, 0);
  if (start < earliest) {
    throw new BadRequestError(
      "Attendance history is limited to the last 3 calendar months",
    );
  }
}

export function resolveAttendanceDateRange(
  opts?: AttendanceListQuery,
): { from: Date; to: Date } {
  const today = startOfDay(new Date());

  if (opts?.month) {
    assertMonthWithinLastThreeMonths(opts.month);
    const { start, end } = parseMonthYm(opts.month);
    return { from: start, to: end };
  }

  if (opts?.date) {
    const d = parseYmd(opts.date);
    return { from: startOfDay(d), to: endOfDay(d) };
  }

  const preset = opts?.preset;
  if (preset === "today") {
    return { from: today, to: endOfDay(today) };
  }
  if (preset === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }
  if (preset === "week") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: startOfDay(from), to: endOfDay(today) };
  }
  if (preset === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: startOfDay(from), to: endOfDay(today) };
  }

  if (opts?.from || opts?.to) {
    const from = opts.from ? startOfDay(parseYmd(opts.from)) : today;
    const to = opts.to ? endOfDay(parseYmd(opts.to)) : endOfDay(today);
    const earliest = new Date();
    earliest.setMonth(earliest.getMonth() - 3);
    earliest.setHours(0, 0, 0, 0);
    if (from < earliest) {
      throw new BadRequestError(
        "Attendance history is limited to the last 3 months",
      );
    }
    return { from, to };
  }

  const from = new Date(today);
  from.setDate(from.getDate() - 13);
  return { from: startOfDay(from), to: endOfDay(today) };
}

export function listSelectableAttendanceMonths(): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push(ym);
  }
  return out;
}
