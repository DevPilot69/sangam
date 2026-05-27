"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PayrollStatusBadge } from "@/components/ui/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuthStore } from "@/lib/auth/auth-store";
import { payrollRepository } from "@/lib/repositories/payroll.repository";
import { apiPayrollRunsToRows } from "@/lib/mappers/payroll.mapper";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

export default function PayrollListPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const runsQuery = useQuery({
    queryKey: ["payroll", "runs", token],
    queryFn: () => payrollRepository.listRuns(token!),
    enabled: !!token,
  });

  const runs = runsQuery.data ? apiPayrollRunsToRows(runsQuery.data) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Payroll</h1>
          <p className="text-sm text-muted-foreground">Runs, locks, and statutory summaries.</p>
        </div>
        <Link href="/payroll/run" className={buttonVariants({ className: "shadow-[var(--shadow-brand)]" })}>
          Start payroll run
        </Link>
      </div>

      {runsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : runs.length === 0 ? (
        <EmptyState variant="payroll" action={{ label: "Start first run", href: "/payroll/run" }} />
      ) : (
        <GlassCard level={2}>
          <div className="overflow-x-auto table-glass rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">Payroll runs</caption>
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Period</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Employees</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Gross pay</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer"
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/payroll/${r.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/payroll/${r.id}`);
                    }}
                  >
                    <td className="px-4 py-3 font-medium">{r.period}</td>
                    <td className="px-4 py-3">{r.employeeCount}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.grossPay)}</td>
                    <td className="px-4 py-3">
                      <PayrollStatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.initiatedBy}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
