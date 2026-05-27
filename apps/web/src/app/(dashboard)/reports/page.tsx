"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Loader2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import {
  downloadCsv,
  fetchReportsCatalog,
  reportResultToCsv,
  runReport,
  type ReportDefinition,
  type ReportResult,
} from "@/lib/api/reports";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";

const CATEGORY_META: Record<
  ReportDefinition["category"],
  { label: string; icon: typeof ClipboardList }
> = {
  payroll: { label: "Payroll", icon: ClipboardList },
  statutory: { label: "Statutory", icon: Building2 },
  attendance: { label: "Attendance & leave", icon: CalendarDays },
  employee: { label: "Workforce", icon: Users },
};

function defaultFilters(def: ReportDefinition): Record<string, string | number> {
  const now = new Date();
  const out: Record<string, string | number> = {};
  for (const f of def.filters) {
    if (f.type === "year") out[f.key] = now.getFullYear();
    else if (f.type === "month") out[f.key] = now.getMonth() + 1;
    else if (f.type === "select" && f.options?.[0]) out[f.key] = f.options[0].value;
    else out[f.key] = "";
  }
  return out;
}

function formatCell(value: string | number | null, key: string): string {
  if (value == null) return "—";
  if (
    typeof value === "number" &&
    (key.includes("gross") ||
      key.includes("net") ||
      key.includes("deduction") ||
      key.includes("amount") ||
      key.includes("ctc"))
  ) {
    return formatCurrency(value);
  }
  return String(value);
}

export default function ReportsPage() {
  const token = useAuthStore((s) => s.token);
  const catalogQuery = useQuery({
    queryKey: ["reports", "catalog", token],
    queryFn: () => fetchReportsCatalog(token!),
    enabled: !!token,
  });

  const reports = catalogQuery.data?.reports ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = reports.find((r) => r.id === selectedId) ?? reports[0] ?? null;

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const [result, setResult] = useState<ReportResult | null>(null);

  useEffect(() => {
    if (!selected) return;
    if (selectedId !== selected.id) {
      setSelectedId(selected.id);
      setFilters(defaultFilters(selected));
      setResult(null);
    }
  }, [selected, selectedId]);

  const grouped = useMemo(() => {
    const map = new Map<ReportDefinition["category"], ReportDefinition[]>();
    for (const r of reports) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return map;
  }, [reports]);

  const runMut = useMutation({
    mutationFn: () => runReport(token!, selected!.id, filters),
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Report generated · ${data.rows.length} rows`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Report failed"),
  });

  function onSelectReport(r: ReportDefinition) {
    setSelectedId(r.id);
    setFilters(defaultFilters(r));
    setResult(null);
  }

  function exportCsv() {
    if (!result) return;
    const safe = result.name.replace(/[^\w]+/g, "-").toLowerCase();
    downloadCsv(`vetan-${safe}-${Date.now()}.csv`, reportResultToCsv(result));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
            Finance reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build payroll, statutory, attendance, and workforce reports — preview in-app and export
            CSV.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[var(--brand-500)]">
          <BarChart3 className="size-5" />
          <FileSpreadsheet className="size-5 opacity-70" />
        </div>
      </div>

      {catalogQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading report catalog…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <GlassCard level={2} className="h-fit p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Report library
            </p>
            <nav className="space-y-4">
              {[...grouped.entries()].map(([category, items]) => {
                const meta = CATEGORY_META[category];
                const Icon = meta.icon;
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                      <Icon className="size-3.5" />
                      {meta.label}
                    </div>
                    <ul className="space-y-0.5">
                      {items.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => onSelectReport(r)}
                            className={cn(
                              "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                              selected?.id === r.id
                                ? "bg-[color-mix(in_srgb,var(--brand-500)_14%,transparent)] font-medium text-foreground"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            {r.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </nav>
          </GlassCard>

          <div className="space-y-4">
            {selected ? (
              <>
                <GlassCard level={2} header={<h2 className="text-sm font-semibold">{selected.name}</h2>}>
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {selected.filters.map((f) => (
                      <div key={f.key}>
                        <Label htmlFor={`filter-${f.key}`}>{f.label}</Label>
                        {f.type === "select" ? (
                          <select
                            id={`filter-${f.key}`}
                            className="mt-1 flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                            value={String(filters[f.key] ?? "")}
                            onChange={(e) =>
                              setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))
                            }
                          >
                            {f.options?.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : f.type === "month" ? (
                          <select
                            id={`filter-${f.key}`}
                            className="mt-1 flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                            value={String(filters[f.key] ?? 1)}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                [f.key]: Number(e.target.value),
                              }))
                            }
                          >
                            {Array.from({ length: 12 }, (_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {new Date(2000, i, 1).toLocaleDateString("en-IN", {
                                  month: "long",
                                })}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            id={`filter-${f.key}`}
                            type="number"
                            className="mt-1"
                            value={String(filters[f.key] ?? "")}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                [f.key]: Number(e.target.value) || e.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="shadow-[var(--shadow-brand)]"
                      disabled={runMut.isPending}
                      onClick={() => runMut.mutate()}
                    >
                      {runMut.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Generate report"
                      )}
                    </Button>
                    {result ? (
                      <Button type="button" variant="outline" className="gap-1" onClick={exportCsv}>
                        <Download className="size-4" />
                        Export CSV
                      </Button>
                    ) : null}
                  </div>
                </GlassCard>

                {result ? (
                  <GlassCard level={2} className="overflow-hidden p-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{result.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.rows.length} rows ·{" "}
                          {new Date(result.generatedAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                      {result.summary ? (
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {Object.entries(result.summary).map(([k, v]) => (
                            <span key={k}>
                              <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}: </span>
                              <span className="font-mono font-medium text-foreground">
                                {typeof v === "number" && k.toLowerCase().includes("total")
                                  ? formatCurrency(v)
                                  : String(v)}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {result.rows.length === 0 ? (
                      <p className="p-6 text-sm text-muted-foreground">
                        No data for these filters. Finalize a payroll run for payroll reports, or
                        widen the date range.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                          <thead className="border-b border-border bg-muted/30">
                            <tr>
                              {result.columns.map((col) => (
                                <th
                                  key={col.key}
                                  className={cn(
                                    "px-4 py-3 font-medium",
                                    col.align === "right" ? "text-right" : "text-left"
                                  )}
                                >
                                  {col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.rows.map((row, i) => (
                              <tr key={i} className="border-b border-border/50">
                                {result.columns.map((col) => (
                                  <td
                                    key={col.key}
                                    className={cn(
                                      "px-4 py-2.5",
                                      col.align === "right"
                                        ? "text-right font-mono tabular-nums"
                                        : ""
                                    )}
                                  >
                                    {formatCell(row[col.key] ?? null, col.key)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </GlassCard>
                ) : (
                  <GlassCard level={2} className="p-8 text-center">
                    <FileSpreadsheet className="mx-auto size-10 text-muted-foreground/50" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      Configure filters and generate a report to preview results here.
                    </p>
                  </GlassCard>
                )}
              </>
            ) : (
              <GlassCard level={2}>
                <p className="text-sm text-muted-foreground">No reports available.</p>
              </GlassCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
