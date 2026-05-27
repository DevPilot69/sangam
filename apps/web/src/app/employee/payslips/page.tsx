"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  downloadMePayslipPdf,
  fetchMePayslipDetail,
  fetchMePayslips,
  type MePayslipDetail,
} from "@/lib/api/employee-portal";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";

function formatInrDetailed(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fyDisplay(year: number, month: number): string {
  const fyStart = month >= 4 ? year : year - 1;
  return `FY ${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
}

function formatJoinDisplay(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function PayslipTable({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; amount: number }[];
  total: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div
        className={cn(
          "grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-xs font-semibold",
          "bg-[color-mix(in_srgb,var(--brand-500)_14%,transparent)] text-foreground"
        )}
      >
        <span>{title}</span>
        <span className="text-right tabular-nums">Amount in (₹)</span>
      </div>
      <div className="divide-y divide-border/60 bg-background">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-sm">
            <span className="uppercase text-muted-foreground">{row.label}</span>
            <span className="text-right font-mono tabular-nums text-foreground">
              {formatInrDetailed(row.amount)}
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 border-t-2 border-border bg-muted/30 px-3 py-2 text-sm font-semibold">
        <span>Total</span>
        <span className="text-right font-mono tabular-nums">{formatInrDetailed(total)}</span>
      </div>
    </div>
  );
}

export default function EmployeePayslipsPage() {
  const token = useAuthStore((s) => s.token);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [payslipTab, setPayslipTab] = useState<"payslip" | "reimb">("payslip");

  const payslipsQuery = useQuery({
    queryKey: ["me", "payslips", token],
    queryFn: () => fetchMePayslips(token!),
    enabled: !!token,
  });

  const detailQuery = useQuery({
    queryKey: ["me", "payslip", selectedRunId, token],
    queryFn: () => fetchMePayslipDetail(token!, selectedRunId!),
    enabled: !!token && !!selectedRunId,
  });

  const sortedSlips = useMemo(() => {
    const list = [...(payslipsQuery.data ?? [])];
    list.sort((a, b) => {
      if (b.periodYear !== a.periodYear) return b.periodYear - a.periodYear;
      return b.periodMonth - a.periodMonth;
    });
    return list;
  }, [payslipsQuery.data]);

  useEffect(() => {
    if (!sortedSlips.length) return;
    setSelectedRunId((prev) => {
      if (prev && sortedSlips.some((s) => s.payrollRunId === prev)) return prev;
      return sortedSlips[0]?.payrollRunId ?? null;
    });
  }, [sortedSlips]);

  const detail = detailQuery.data as MePayslipDetail | undefined;

  async function handleDownloadPdf() {
    if (!token || !selectedRunId || !detail) return;
    const fn = `vetan-payslip-${detail.periodLabel.replace(/\s+/g, "-")}-${detail.employee.code}.pdf`;
    try {
      await downloadMePayslipPdf(token, selectedRunId, fn);
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Download failed");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Payslips
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="payslip-period">
            Pay period
          </label>
          <select
            id="payslip-period"
            className="h-9 min-w-[200px] rounded-lg border border-border bg-background px-3 text-sm"
            value={selectedRunId ?? ""}
            onChange={(e) => setSelectedRunId(e.target.value || null)}
            disabled={!sortedSlips.length}
          >
            {sortedSlips.map((s) => (
              <option key={s.payrollRunId} value={s.payrollRunId}>
                {MONTHS[s.periodMonth - 1] ?? s.periodMonth} {s.periodYear} ·{" "}
                {fyDisplay(s.periodYear, s.periodMonth)}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 shadow-[var(--shadow-brand)]"
            disabled={!selectedRunId || !detail}
            onClick={() => void handleDownloadPdf()}
          >
            <Download className="size-4" />
            Download
          </Button>
        </div>
      </div>

      <div className="flex justify-center gap-0 rounded-lg border border-border p-1 sm:inline-flex">
        <button
          type="button"
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            payslipTab === "payslip"
              ? "bg-[var(--brand-500)] text-white"
              : "text-muted-foreground hover:bg-muted/50"
          )}
          onClick={() => setPayslipTab("payslip")}
        >
          Payslip
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="cursor-not-allowed rounded-md px-4 py-2 text-sm font-medium text-muted-foreground opacity-60"
        >
          Reimb. payslip
        </button>
      </div>

      {payslipTab === "reimb" ? null : payslipsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading payslips…
        </p>
      ) : !sortedSlips.length ? (
        <p className="text-sm text-muted-foreground">No payslips yet.</p>
      ) : detailQuery.isLoading || !detail ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading payslip…
        </p>
      ) : detailQuery.error ? (
        <p className="text-sm text-destructive">{(detailQuery.error as Error).message}</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <PayslipTable title="Earnings" rows={detail.earnings} total={detail.gross} />
            <PayslipTable
              title="Deductions"
              rows={detail.deductionLines}
              total={detail.deductions}
            />
            <div className="space-y-3 lg:col-span-1">
              <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/25">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-200/90">
                  Employee details
                </p>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Name</dt>
                    <dd className="font-medium">{detail.employee.name}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Employee no.</dt>
                    <dd className="font-mono">{detail.employee.code}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Joining date</dt>
                    <dd>{formatJoinDisplay(detail.employee.dateOfJoining)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Bank account</dt>
                    <dd className="font-mono text-xs">
                      {detail.employee.bankAccount ?? "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] text-muted-foreground">Designation</dt>
                    <dd>{detail.employee.designation ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Grade</dt>
                    <dd>{detail.employee.grade ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">PAN</dt>
                    <dd className="font-mono">{detail.employee.pan ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Department</dt>
                    <dd>{detail.employee.department ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">IFSC</dt>
                    <dd className="font-mono text-xs">{detail.employee.ifsc ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">LOP</dt>
                    <dd className="tabular-nums">—</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Effective work days</dt>
                    <dd className="tabular-nums">—</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Net pay for {detail.periodLabel}
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[var(--success-text)]">
                  {formatInrDetailed(detail.net)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
