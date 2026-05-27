"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Fingerprint } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { GlassCard } from "@/components/ui/glass-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { fetchMeAttendanceMonth } from "@/lib/api/employee-portal";
import type { MeAttendanceDay } from "@/lib/api/employee-portal";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  buildSessionRows,
  computeDayMetrics,
  formatClockFromIso,
  hasIntegrationSessions,
  monthAvgActualHoursLabel,
  monthAvgGrossHoursLabel,
  resolveShiftForDay,
} from "@/lib/utils/attendance-display";

const WEEKDAY_HEAD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sourceLabel(source: string): string {
  const s = source.toLowerCase();
  if (s === "biometric") return "Biometric (fingerprint)";
  if (s === "manual") return "Manual entry";
  if (s === "import") return "Import / file";
  if (s === "system") return "System";
  return source;
}

function statusLabel(day: MeAttendanceDay): string {
  if (day.isWeekend) return "Weekend";
  if (day.isHoliday) return day.holidayName ? `Holiday · ${day.holidayName}` : "Holiday / off";
  switch (day.status) {
    case "PRESENT":
      return "Present";
    case "LATE":
      return "Present (late arrival)";
    case "WFH":
      return "Work from home";
    case "ABSENT":
      return "Absent";
    case "HOLIDAY":
      return "Holiday / off";
    default:
      return day.status;
  }
}

function calendarCellClass(code: string): string {
  if (code === "P" || code === "L") return "bg-amber-100/80 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50";
  if (code === "A") return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200";
  if (code === "O") return "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-100";
  if (code === "-") return "bg-muted/40 text-muted-foreground";
  return "bg-muted/30";
}

export default function EmployeeAttendancePage() {
  const token = useAuthStore((s) => s.token);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const year = cursor.getFullYear();
  const month = cursor.getMonth() + 1;

  const monthQuery = useQuery({
    queryKey: ["me", "attendance-month", year, month, token],
    queryFn: () => fetchMeAttendanceMonth(token!, year, month),
    enabled: !!token,
  });

  useEffect(() => {
    setSelectedDate(null);
  }, [year, month]);

  const data = monthQuery.data;

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const selected =
    selectedDate && data ? (data.days.find((d) => d.date === selectedDate) ?? null) : null;

  /** Default selection: today if it falls in this month, else first logged weekday. */
  const days = data?.days ?? [];
  const effectiveSelected = useMemo(() => {
    if (!data) return null;
    if (selected) return selected;
    const inMonthToday = days.find((d) => d.date === todayStr);
    if (inMonthToday) {
      return inMonthToday;
    }
    return days.find((d) => !d.isWeekend && !d.isHoliday) ?? days[0] ?? null;
  }, [data, days, selected, todayStr]);

  const shift = useMemo(() => {
    if (!data || !effectiveSelected) return data?.defaultShift ?? null;
    return resolveShiftForDay(effectiveSelected.detail, data.defaultShift);
  }, [data, effectiveSelected]);

  const metrics = useMemo(() => {
    if (!effectiveSelected || !shift) return null;
    return computeDayMetrics(
      effectiveSelected.date,
      effectiveSelected.checkIn,
      effectiveSelected.checkOut,
      shift
    );
  }, [effectiveSelected, shift]);

  const sessions = useMemo(() => {
    if (!effectiveSelected || !shift) return [];
    return buildSessionRows(
      effectiveSelected.detail,
      metrics,
      effectiveSelected.checkIn,
      effectiveSelected.checkOut,
      shift
    );
  }, [effectiveSelected, metrics, shift]);

  const avgGross = useMemo(() => (data ? monthAvgGrossHoursLabel(data.days) : null), [data]);
  const avgActual = useMemo(
    () => (data ? monthAvgActualHoursLabel(data.days, data.defaultShift) : null),
    [data]
  );

  const calendarCells = useMemo(() => {
    if (!data) return { lead: 0, cells: [] as MeAttendanceDay[] };
    const first = new Date(data.year, data.month - 1, 1);
    const lead = first.getDay();
    return { lead, cells: data.days };
  }, [data]);

  function onRegularizeClick() {
    toast.message("Regularization", {
      description: "Request corrections for missing punches or exceptions. This workflow will be available in a later release.",
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight md:text-3xl">
            Attendance info
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Daily attendance with arrival and departure timestamps from your organization&apos;s biometric
            scanners. Select a day to review punches and processed hours.
          </p>
        </div>
        <Button type="button" className="shrink-0 gap-2 self-start shadow-[var(--shadow-brand)]" onClick={onRegularizeClick}>
          My regularizations
        </Button>
      </div>

      {monthQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading attendance…</p>
      ) : monthQuery.isError ? (
        <GlassCard level={2}>
          <p className="text-sm text-[var(--danger-text)]">Could not load attendance for this month.</p>
        </GlassCard>
      ) : data ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <GlassCard level={2} className="!p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avg. work hrs</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{avgGross ?? "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Gross time between first in and last out (weekdays).</p>
            </GlassCard>
            <GlassCard level={2} className="!p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avg. actual work hrs</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{avgActual ?? "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">After break allowance vs your shift template.</p>
            </GlassCard>
            <GlassCard level={2} className="!p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Penalty days</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{data.penaltyDays}</p>
              <p className="mt-1 text-xs text-muted-foreground">Days marked late for this month.</p>
            </GlassCard>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1 text-muted-foreground" })}
              onClick={() => toast.message("Insights", { description: "Deeper attendance analytics will appear here." })}
            >
              +{data.insightsCount} insights
            </button>
          </div>

          {data.exceptionDays > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--warning-text)]/30 bg-[var(--warning-bg)] px-4 py-3">
              <p className="text-sm font-medium text-[var(--warning-text)]">
                {data.exceptionDays} exception day{data.exceptionDays !== 1 ? "s" : ""} may need a correction
              </p>
              <Button type="button" size="sm" variant="secondary" onClick={onRegularizeClick}>
                Regularize
              </Button>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.15fr_minmax(0,1fr)]">
            <GlassCard
              level={2}
              header={
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">{data.monthLabel}</h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Previous month"
                      onClick={() => setCursor(new Date(year, month - 2, 1))}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Next month"
                      onClick={() => setCursor(new Date(year, month, 1))}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              }
            >
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
                {WEEKDAY_HEAD.map((w) => (
                  <div key={w} className="py-1">
                    {w}
                  </div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: calendarCells.lead }).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square rounded-md bg-transparent" />
                ))}
                {calendarCells.cells.map((d) => {
                  const isSel = effectiveSelected?.date === d.date;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setSelectedDate(d.date)}
                      title={`${d.date} · ${d.status}`}
                      className={[
                        "relative flex aspect-square flex-col items-center justify-center rounded-md border text-xs font-semibold transition-colors",
                        calendarCellClass(d.calendarCode),
                        isSel ? "ring-2 ring-[var(--brand-500)] ring-offset-2 ring-offset-background" : "border-transparent",
                        d.needsRegularization && !d.isWeekend && !d.isHoliday ? "outline outline-1 outline-dashed outline-[var(--warning-text)]" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="tabular-nums">{d.dayOfMonth}</span>
                      <span className="mt-0.5 text-[10px] font-bold leading-none opacity-90">
                        {d.calendarCode === "-" ? "" : d.calendarCode}
                      </span>
                      {!d.isWeekend && !d.isHoliday ? (
                        <span className="absolute bottom-0.5 right-0.5 text-[8px] font-medium uppercase text-muted-foreground opacity-80">
                          {resolveShiftForDay(d.detail, data.defaultShift).code}
                        </span>
                      ) : null}
                      {d.isHoliday ? (
                        <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-sky-500" aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <ul className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <span className="inline-block size-3 rounded bg-amber-100 dark:bg-amber-950/40" /> Present
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="inline-block size-3 rounded bg-red-50 dark:bg-red-950/30" /> Absent
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="inline-block size-3 rounded bg-sky-50 dark:bg-sky-950/40" /> Off / holiday
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="inline-block size-3 rounded bg-muted/40" /> Weekend
                </li>
              </ul>
            </GlassCard>

            <GlassCard
              level={2}
              className="min-h-[320px]"
              header={
                effectiveSelected ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {new Date(`${effectiveSelected.date}T12:00:00`).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {shift ? (
                      <p className="text-sm font-semibold">
                        {shift.name} ({shift.code}){" "}
                        <span className="font-normal text-muted-foreground">
                          · {shift.start} to {shift.end}
                        </span>
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <h2 className="text-sm font-semibold">Day detail</h2>
                )
              }
            >
              {!effectiveSelected ? (
                <p className="text-sm text-muted-foreground">Select a day on the calendar.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Fingerprint className="size-3.5" />
                    <span>Source: {sourceLabel(effectiveSelected.source)}</span>
                  </div>

                  {metrics ? (
                    <div className="overflow-x-auto rounded-lg border border-border/70">
                      <table className="w-full min-w-[520px] text-xs">
                        <tbody className="[&_td]:border-border/60 [&_td]:px-2 [&_td]:py-1.5 [&_tr]:border-b">
                          <tr>
                            <td className="font-medium text-muted-foreground">First in</td>
                            <td className="font-mono tabular-nums">{metrics.firstIn}</td>
                            <td className="font-medium text-muted-foreground">Late in</td>
                            <td className="font-mono tabular-nums">{metrics.lateIn ?? "—"}</td>
                          </tr>
                          <tr>
                            <td className="font-medium text-muted-foreground">Last out</td>
                            <td className="font-mono tabular-nums">{metrics.lastOut}</td>
                            <td className="font-medium text-muted-foreground">Early out</td>
                            <td className="font-mono tabular-nums">{metrics.earlyOut ?? "—"}</td>
                          </tr>
                          <tr>
                            <td className="font-medium text-muted-foreground">Total work hrs</td>
                            <td className="font-mono tabular-nums">{metrics.totalWorkHrs}</td>
                            <td className="font-medium text-muted-foreground">Break hrs</td>
                            <td className="font-mono tabular-nums">{metrics.breakHrs}</td>
                          </tr>
                          <tr>
                            <td className="font-medium text-muted-foreground">Actual work hrs</td>
                            <td className="font-mono tabular-nums">{metrics.actualWorkHrs}</td>
                            <td className="font-medium text-muted-foreground">Within shift window</td>
                            <td className="font-mono tabular-nums">{metrics.workHrsInShift}</td>
                          </tr>
                          <tr>
                            <td className="font-medium text-muted-foreground">Shortfall hrs</td>
                            <td className="font-mono tabular-nums">{metrics.shortfallHrs ?? "—"}</td>
                            <td className="font-medium text-muted-foreground">Excess hrs</td>
                            <td className="font-mono tabular-nums">{metrics.excessHrs ?? "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">No punch pair for this day</p>
                      <p className="mt-1 text-xs">
                        When you scan in and out on the biometric device, first and last timestamps appear here.
                      </p>
                      {effectiveSelected.checkIn || effectiveSelected.checkOut ? (
                        <p className="mt-2 text-xs">
                          Partial data: in {formatClockFromIso(effectiveSelected.checkIn)} · out{" "}
                          {formatClockFromIso(effectiveSelected.checkOut)}
                        </p>
                      ) : null}
                    </div>
                  )}

                  <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="mt-1 font-medium">{statusLabel(effectiveSelected)}</p>
                    {effectiveSelected.remarks ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Remarks: </span>
                        {effectiveSelected.remarks}
                      </p>
                    ) : null}
                  </div>

                  {sessions.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Session details
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-border/70">
                        <table className="w-full min-w-[400px] text-xs">
                          <thead>
                            <tr className="border-b bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              <th className="px-2 py-2">Session</th>
                              <th className="px-2 py-2">Timing</th>
                              <th className="px-2 py-2">First in</th>
                              <th className="px-2 py-2">Last out</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessions.map((s, idx) => (
                              <tr key={`${s.name}-${s.timing}-${idx}`} className="border-b border-border/50 last:border-0">
                                <td className="px-2 py-2 font-medium">{s.name}</td>
                                <td className="px-2 py-2 text-muted-foreground">{s.timing}</td>
                                <td className="px-2 py-2 font-mono tabular-nums">{s.firstIn}</td>
                                <td className="px-2 py-2 font-mono tabular-nums">{s.lastOut}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {!hasIntegrationSessions(effectiveSelected.detail) && metrics ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Sessions are inferred from your shift when the access control system does not send a split.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </GlassCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
