/** Shift template (wall-clock HH:MM) for attendance calculations in the employee’s local timezone. */

export type AttendanceShiftTemplate = {
  code: string;
  name: string;
  start: string;
  end: string;
  breakMinutes: number;
};

export type AttendanceDayMetrics = {
  firstIn: string;
  lastOut: string;
  lateIn: string | null;
  earlyOut: string | null;
  totalWorkHrs: string;
  breakHrs: string;
  actualWorkHrs: string;
  workHrsInShift: string;
  shortfallHrs: string | null;
  excessHrs: string | null;
  actualWorkMinutes: number;
};

export type AttendanceSessionRow = {
  name: string;
  timing: string;
  firstIn: string;
  lastOut: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format clock time from ISO timestamp in the user’s locale. */
export function formatClockFromIso(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Total minutes -> "H:MM" duration (not clock time). */
export function formatDurationHhMm(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${pad2(mm)}`;
}

function parseHmOnDate(dateStr: string, hm: string): Date {
  const [h, m] = hm.split(":").map((x) => Number(x));
  const d = new Date(`${dateStr}T${pad2(h || 0)}:${pad2(m || 0)}:00`);
  return d;
}

export function resolveShiftForDay(
  detail: Record<string, unknown> | null,
  fallback: AttendanceShiftTemplate
): AttendanceShiftTemplate {
  if (!detail || typeof detail !== "object") return fallback;
  const raw = detail.shift;
  if (!raw || typeof raw !== "object") return fallback;
  const s = raw as Record<string, unknown>;
  const code = typeof s.code === "string" ? s.code : fallback.code;
  const name = typeof s.name === "string" ? s.name : fallback.name;
  const start = typeof s.start === "string" ? s.start : fallback.start;
  const end = typeof s.end === "string" ? s.end : fallback.end;
  const breakMinutes =
    typeof s.breakMinutes === "number" && Number.isFinite(s.breakMinutes)
      ? s.breakMinutes
      : fallback.breakMinutes;
  return { code, name, start, end, breakMinutes };
}

export function computeDayMetrics(
  dateStr: string,
  checkIn: string | null,
  checkOut: string | null,
  shift: AttendanceShiftTemplate
): AttendanceDayMetrics | null {
  if (!checkIn || !checkOut) return null;
  const inD = new Date(checkIn);
  const outD = new Date(checkOut);
  if (Number.isNaN(inD.getTime()) || Number.isNaN(outD.getTime())) return null;
  const workMs = Math.max(0, outD.getTime() - inD.getTime());
  const workMins = Math.floor(workMs / 60000);

  const shiftStart = parseHmOnDate(dateStr, shift.start);
  const shiftEnd = parseHmOnDate(dateStr, shift.end);
  const shiftMins = Math.max(0, Math.floor((shiftEnd.getTime() - shiftStart.getTime()) / 60000));

  const lateMins = Math.max(0, Math.floor((inD.getTime() - shiftStart.getTime()) / 60000));
  const earlyMins = Math.max(0, Math.floor((shiftEnd.getTime() - outD.getTime()) / 60000));

  const breakMins = workMins > 4 * 60 ? shift.breakMinutes : 0;
  const actualMins = Math.max(0, workMins - breakMins);
  const expectedNet = Math.max(0, shiftMins - shift.breakMinutes);
  const shortfall = Math.max(0, expectedNet - actualMins);
  const excess = Math.max(0, actualMins - expectedNet);

  return {
    firstIn: formatClockFromIso(checkIn),
    lastOut: formatClockFromIso(checkOut),
    lateIn: lateMins > 0 ? formatDurationHhMm(lateMins) : null,
    earlyOut: earlyMins > 0 ? formatDurationHhMm(earlyMins) : null,
    totalWorkHrs: formatDurationHhMm(workMins),
    breakHrs: formatDurationHhMm(breakMins),
    actualWorkHrs: formatDurationHhMm(actualMins),
    workHrsInShift: formatDurationHhMm(Math.min(workMins, shiftMins)),
    shortfallHrs: shortfall > 0 ? formatDurationHhMm(shortfall) : null,
    excessHrs: excess > 0 ? formatDurationHhMm(excess) : null,
    actualWorkMinutes: actualMins,
  };
}

function readSessionsFromDetail(detail: Record<string, unknown> | null): AttendanceSessionRow[] | null {
  if (!detail || typeof detail !== "object") return null;
  const raw = detail.sessions;
  if (!Array.isArray(raw)) return null;
  const rows: AttendanceSessionRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    const name = typeof s.name === "string" ? s.name : "Session";
    const timing =
      typeof s.timing === "string"
        ? s.timing
        : typeof s.timingLabel === "string"
          ? s.timingLabel
          : [s.windowStart, s.windowEnd].every((x) => typeof x === "string")
            ? `${s.windowStart} – ${s.windowEnd}`
            : "—";
    const firstIn = typeof s.firstIn === "string" && s.firstIn ? s.firstIn : "—";
    const lastOut = typeof s.lastOut === "string" && s.lastOut ? s.lastOut : "—";
    rows.push({
      name,
      timing,
      firstIn: firstIn || "—",
      lastOut: lastOut || "—",
    });
  }
  return rows.length ? rows : null;
}

/** Session grid for UI: uses integration payload when present, otherwise a readable split of the day. */
export function buildSessionRows(
  detail: Record<string, unknown> | null,
  metrics: AttendanceDayMetrics | null,
  checkIn: string | null,
  checkOut: string | null,
  shift: AttendanceShiftTemplate
): AttendanceSessionRow[] {
  const fromDetail = readSessionsFromDetail(detail);
  if (fromDetail) return fromDetail;

  if (!metrics || !checkIn || !checkOut) return [];

  const midHour = (() => {
    const startH = Number(shift.start.split(":")[0] ?? 10);
    const endH = Number(shift.end.split(":")[0] ?? 18);
    const mh = Math.round((startH + endH) / 2);
    return Math.min(Math.max(mh, startH + 1), endH - 1);
  })();
  const mid = `${pad2(midHour)}:30`;
  const nextStartParts = mid.split(":");
  const nextHour = Number(nextStartParts[0] ?? 14);
  const nextMin = Number(nextStartParts[1] ?? 30) + 1;
  const nextStart =
    nextMin >= 60 ? `${pad2(nextHour + 1)}:00` : `${pad2(nextHour)}:${pad2(nextMin)}`;

  return [
    {
      name: "Session 1",
      timing: `${shift.start} – ${mid}`,
      firstIn: metrics.firstIn,
      lastOut: "—",
    },
    {
      name: "Session 2",
      timing: `${nextStart} – ${shift.end}`,
      firstIn: "—",
      lastOut: metrics.lastOut,
    },
  ];
}

export function hasIntegrationSessions(detail: Record<string, unknown> | null): boolean {
  return readSessionsFromDetail(detail) != null;
}

export function monthAvgActualHoursLabel(
  days: {
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    detail: Record<string, unknown> | null;
    isWeekend: boolean;
    isHoliday: boolean;
  }[],
  defaultShift: AttendanceShiftTemplate
): string | null {
  let sum = 0;
  let n = 0;
  for (const d of days) {
    if (d.isWeekend || d.isHoliday) continue;
    const shift = resolveShiftForDay(d.detail, defaultShift);
    const m = computeDayMetrics(d.date, d.checkIn, d.checkOut, shift);
    if (m) {
      sum += m.actualWorkMinutes;
      n += 1;
    }
  }
  if (!n) return null;
  return formatDurationHhMm(sum / n);
}

export function monthAvgGrossHoursLabel(
  days: { checkIn: string | null; checkOut: string | null; isWeekend: boolean; isHoliday: boolean }[]
): string | null {
  let sum = 0;
  let n = 0;
  for (const d of days) {
    if (d.isWeekend || d.isHoliday) continue;
    if (!d.checkIn || !d.checkOut) continue;
    const inD = new Date(d.checkIn);
    const outD = new Date(d.checkOut);
    if (Number.isNaN(inD.getTime()) || Number.isNaN(outD.getTime())) continue;
    const workMins = Math.max(0, Math.floor((outD.getTime() - inD.getTime()) / 60000));
    sum += workMins;
    n += 1;
  }
  if (!n) return null;
  return formatDurationHhMm(sum / n);
}
