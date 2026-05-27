"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Home,
  Search,
  UserX,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchAttendanceMonths,
  fetchAttendanceRecords,
  fetchAttendanceSummary,
  type AttendancePreset,
  type AttendanceQueryParams,
  type AttendanceStatusFilter,
} from "@/lib/api/attendance";
import { fetchEmployees } from "@/lib/api/employees";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

const PRESETS: { id: AttendancePreset | "custom"; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom range" },
];

const STATUS_FILTER_OPTIONS: {
  value: "" | AttendanceStatusFilter;
  label: string;
}[] = [
  { value: "", label: "All statuses" },
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "WFH", label: "WFH" },
];

const STAT_CARDS: {
  key: "present" | "late" | "absent" | "wfh";
  status: AttendanceStatusFilter;
  label: string;
  icon: typeof CheckCircle2;
  color: string;
  bg: string;
}[] = [
  {
    key: "present",
    status: "PRESENT",
    label: "Present",
    icon: CheckCircle2,
    color: "text-[var(--success-text)]",
    bg: "bg-[color-mix(in_srgb,var(--success-text)_12%,transparent)]",
  },
  {
    key: "late",
    status: "LATE",
    label: "Late",
    icon: Clock,
    color: "text-[var(--warning-text)]",
    bg: "bg-[color-mix(in_srgb,var(--warning-text)_12%,transparent)]",
  },
  {
    key: "absent",
    status: "ABSENT",
    label: "Absent",
    icon: UserX,
    color: "text-destructive",
    bg: "bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)]",
  },
  {
    key: "wfh",
    status: "WFH",
    label: "WFH",
    icon: Home,
    color: "text-[var(--brand-500)]",
    bg: "bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)]",
  },
];

export default function AttendancePage() {
  const token = useAuthStore((s) => s.token);
  const [preset, setPreset] = useState<AttendancePreset | "custom">("month");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [specificDate, setSpecificDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | AttendanceStatusFilter>("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const monthsQuery = useQuery({
    queryKey: ["attendance", "months", token],
    queryFn: () => fetchAttendanceMonths(token!),
    enabled: !!token,
  });

  const months = monthsQuery.data?.months ?? [];
  const activeMonth = selectedMonth || months[0] || "";

  const employeesQuery = useQuery({
    queryKey: ["employees", "attendance-filter", token],
    queryFn: () => fetchEmployees(token!, { page: 1, pageSize: 200, status: "ACTIVE" }),
    enabled: !!token,
  });

  const queryParams = useMemo((): AttendanceQueryParams => {
    const base: AttendanceQueryParams = {
      limit: 200,
      ...(searchDebounced ? { search: searchDebounced } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    };
    if (specificDate) return { ...base, date: specificDate };
    if (preset === "custom" && from && to) {
      return { ...base, from, to, preset: "range" };
    }
    if (preset === "month" && activeMonth) return { ...base, month: activeMonth };
    if (preset === "today" || preset === "yesterday" || preset === "week") {
      return { ...base, preset };
    }
    if (activeMonth) return { ...base, month: activeMonth };
    return { ...base, preset: "month" };
  }, [preset, activeMonth, specificDate, from, to, searchDebounced, employeeId, statusFilter]);

  const summaryQuery = useQuery({
    queryKey: ["attendance", "summary", queryParams, token],
    queryFn: () => fetchAttendanceSummary(token!, queryParams),
    enabled: !!token,
  });

  const recordsQuery = useQuery({
    queryKey: ["attendance", "records", queryParams, token],
    queryFn: () => fetchAttendanceRecords(token!, queryParams),
    enabled: !!token,
  });

  const s = summaryQuery.data;
  const rangeLabel =
    s?.from && s?.to
      ? s.from === s.to
        ? s.from
        : `${s.from} → ${s.to}`
      : "Selected range";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor clock-ins for the last 3 months — filter by day, week, month, or employee.
        </p>
      </div>

      <GlassCard level={2} className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="size-4 text-[var(--brand-500)]" />
          <span className="text-sm font-medium">Quick filters</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={preset === p.id ? "default" : "outline"}
              onClick={() => {
                setPreset(p.id);
                setSpecificDate("");
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {months.length > 0 ? (
          <div>
            <Label className="text-xs text-muted-foreground">Month (last 3 months)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {months.map((ym) => (
                <Button
                  key={ym}
                  type="button"
                  size="sm"
                  variant={activeMonth === ym && !specificDate ? "secondary" : "outline"}
                  onClick={() => {
                    setSelectedMonth(ym);
                    setPreset("month");
                    setSpecificDate("");
                  }}
                >
                  {monthLabel(ym)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div>
            <Label htmlFor="attDate">Specific date</Label>
            <Input
              id="attDate"
              type="date"
              value={specificDate}
              onChange={(e) => {
                setSpecificDate(e.target.value);
                if (e.target.value) setPreset("custom");
              }}
              className="mt-1"
            />
          </div>
          {preset === "custom" ? (
            <>
              <div>
                <Label htmlFor="attFrom">From</Label>
                <Input
                  id="attFrom"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="attTo">To</Label>
                <Input
                  id="attTo"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </>
          ) : null}
          <div>
            <Label htmlFor="attSearch">Search name or code</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="attSearch"
                className="pl-9"
                placeholder="e.g. EMP-001 or Priya"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={() => setSearchDebounced(search.trim())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSearchDebounced(search.trim());
                }}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="attEmployee">Employee</Label>
            <select
              id="attEmployee"
              className="mt-1 flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">All employees</option>
              {(employeesQuery.data?.items ?? []).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeCode} — {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Showing: <span className="font-medium text-foreground">{rangeLabel}</span>
          {s?.totalRecords != null ? ` · ${s.totalRecords} record(s)` : null}
        </p>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = s?.[card.key] ?? 0;
          const isActive = statusFilter === card.status;
          return (
            <button
              key={card.key}
              type="button"
              className="text-left"
              title={`Filter ${card.label}`}
              onClick={() =>
                setStatusFilter((prev) =>
                  prev === card.status ? "" : card.status
                )
              }
            >
              <GlassCard
                level={2}
                className={cn(
                  "!p-4 transition-colors",
                  isActive &&
                    "ring-2 ring-[var(--brand-500)] ring-offset-2 ring-offset-background"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
                  </div>
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg",
                      card.bg
                    )}
                  >
                    <Icon className={cn("size-5", card.color)} aria-hidden />
                  </div>
                </div>
              </GlassCard>
            </button>
          );
        })}
      </div>

      <GlassCard level={2} className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Attendance records</span>
        </div>
        {recordsQuery.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : (recordsQuery.data ?? []).length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No attendance records for this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Employee</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Check in</th>
                  <th className="px-4 py-3 text-left font-medium">Check out</th>
                  <th className="px-4 py-3 text-left font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(recordsQuery.data ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                    <td className="px-4 py-3">
                      {r.employeeName}
                      <span className="ml-1 font-mono text-xs text-muted-foreground">
                        {r.employeeCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">{r.status.toLowerCase()}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatTime(r.checkIn)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatTime(r.checkOut)}</td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-muted-foreground">
                      {r.remarks ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
