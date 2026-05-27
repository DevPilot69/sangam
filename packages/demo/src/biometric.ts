import { prisma } from "@sangam/db";
import { isDemoMode } from "./demo-mode";

/**
 * Biometric attendance mock provider.
 *
 * Real integrations push device punches into AttendanceRecord. In demo mode
 * we synthesise plausible attendance for every ACTIVE employee for a given
 * day, with realistic noise (a handful of absences, a few late arrivals, the
 * occasional WFH).
 *
 * Surface:
 *  - `seedDay(tenantId, date)`     — seeds one tenant + one calendar day,
 *                                    idempotent on the (employeeId, date)
 *                                    unique index (uses skipDuplicates).
 *  - `seedAllTenantsToday()`        — cron entrypoint, iterates every tenant
 *                                    and seeds today.
 *
 * Phase 6 swap: replace this module with the real biometric webhook receiver
 * and disable the cron. Toggle via `DEMO_MODE=false`.
 */

export type BiometricSeedResult = {
  tenantId: string;
  date: string;
  created: number;
  skipped: number;
  totalActive: number;
};

const DEFAULT_DISTRIBUTION = {
  present: 0.82,
  late: 0.08,
  wfh: 0.06,
  absent: 0.04,
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function pickStatus(rand: number): "PRESENT" | "ABSENT" | "LATE" | "WFH" {
  // Cumulative thresholds — order matches DEFAULT_DISTRIBUTION precedence.
  const present = DEFAULT_DISTRIBUTION.present;
  const late = present + DEFAULT_DISTRIBUTION.late;
  const wfh = late + DEFAULT_DISTRIBUTION.wfh;
  if (rand < present) return "PRESENT";
  if (rand < late) return "LATE";
  if (rand < wfh) return "WFH";
  return "ABSENT";
}

function checkInFor(date: Date, status: string): Date | null {
  if (status === "ABSENT") return null;
  const d = new Date(date);
  if (status === "LATE") {
    // 09:45 .. 10:30
    const minutes = 9 * 60 + 45 + Math.floor(Math.random() * 45);
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  } else {
    // 08:50 .. 09:25
    const minutes = 8 * 60 + 50 + Math.floor(Math.random() * 35);
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  }
  return d;
}

function checkOutFor(date: Date, status: string): Date | null {
  if (status === "ABSENT") return null;
  const d = new Date(date);
  // 17:55 .. 19:10
  const minutes = 17 * 60 + 55 + Math.floor(Math.random() * 75);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

export async function seedDay(
  tenantId: string,
  date: Date = new Date(),
): Promise<BiometricSeedResult> {
  const day = startOfDay(date);

  const employees = await prisma.employee.findMany({
    where: { tenantId, deletedAt: null, status: "ACTIVE" },
    select: { id: true },
  });

  if (employees.length === 0) {
    return {
      tenantId,
      date: day.toISOString().slice(0, 10),
      created: 0,
      skipped: 0,
      totalActive: 0,
    };
  }

  const rows = employees.map(({ id }) => {
    const status = pickStatus(Math.random());
    return {
      tenantId,
      employeeId: id,
      date: day,
      status,
      checkIn: checkInFor(day, status),
      checkOut: checkOutFor(day, status),
      source: "biometric-demo",
      remarks: null,
    };
  });

  // skipDuplicates relies on the (employeeId, date) @@unique index. Re-running
  // the cron is therefore a no-op.
  const result = await prisma.attendanceRecord.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return {
    tenantId,
    date: day.toISOString().slice(0, 10),
    created: result.count,
    skipped: rows.length - result.count,
    totalActive: rows.length,
  };
}

export async function seedAllTenantsToday(): Promise<BiometricSeedResult[]> {
  const tenants = await prisma.tenant.findMany({
    select: { id: true },
  });
  const today = new Date();
  const results: BiometricSeedResult[] = [];
  for (const t of tenants) {
    results.push(await seedDay(t.id, today));
  }
  return results;
}

/** Convenience helper for the front-end "Simulate today" admin button. */
export async function seedToday(tenantId: string) {
  if (!isDemoMode()) {
    throw new Error(
      "Biometric mock seeder is disabled because DEMO_MODE=false. Wire up the real biometric webhook to receive punches.",
    );
  }
  return seedDay(tenantId, new Date());
}
