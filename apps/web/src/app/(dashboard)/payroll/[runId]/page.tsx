"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { PayrollStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/lib/auth/auth-store";
import { payrollRepository } from "@/lib/repositories/payroll.repository";
import { mapPayrollStatus } from "@/lib/mappers/payroll.mapper";
import { formatCurrency } from "@/lib/utils/formatters";

export default function PayrollRunDetailPage() {
  const params = useParams();
  const id = String(params.runId);
  const token = useAuthStore((s) => s.token);

  const runQuery = useQuery({
    queryKey: ["payroll", "run", id, token],
    queryFn: () => payrollRepository.getRun(token!, id),
    enabled: !!token && !!id,
  });

  const run = runQuery.data;

  if (runQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading payroll run…</p>;
  }

  if (!run) {
    return (
      <div className="space-y-4">
        <Link href="/payroll" className="text-sm text-muted-foreground hover:text-foreground">
          ← All runs
        </Link>
        <p className="text-sm text-destructive">Payroll run not found.</p>
      </div>
    );
  }

  const uiStatus = mapPayrollStatus(run.status);

  return (
    <div className="space-y-6">
      <Link href="/payroll" className="text-sm text-muted-foreground hover:text-foreground">
        ← All runs
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
            {run.periodLabel} payroll
          </h1>
          <div className="mt-2">
            <PayrollStatusBadge status={uiStatus} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary">
            Export
          </Button>
          <Button type="button">Download payslips</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Gross pay", value: formatCurrency(run.grossPay) },
          { label: "Deductions", value: formatCurrency(run.totalDeductions) },
          { label: "Net pay", value: formatCurrency(run.totalNet) },
          { label: "Employees", value: String(run.employeeCount) },
        ].map((k) => (
          <GlassCard key={k.label} level={2} className="!p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">{k.value}</p>
          </GlassCard>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="glass-2 border border-border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="statutory">Statutory</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <GlassCard level={2}>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2 text-right">Gross</th>
                    <th className="px-3 py-2 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {run.entries.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        {e.employeeName}
                        <span className="ml-1 text-xs text-muted-foreground">({e.employeeCode})</span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{e.departmentName ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(e.gross)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(e.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </TabsContent>
        <TabsContent value="payslips" className="mt-4">
          <GlassCard level={2}>
            <p className="text-sm text-muted-foreground">
              {run.employeeCount} payslips generated for this run.
            </p>
          </GlassCard>
        </TabsContent>
        <TabsContent value="statutory" className="mt-4">
          <GlassCard level={2}>
            <ul className="space-y-2 text-sm font-mono">
              <li>PF (employee + employer) — from entry breakdown</li>
              <li>ESI — statutory</li>
              <li>Professional tax — state</li>
            </ul>
          </GlassCard>
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <GlassCard level={2}>
            <ul className="space-y-2 text-sm">
              <li>Run created · {run.initiatedByName ?? "System"}</li>
              <li>Status · {run.status}</li>
              <li>Updated · {new Date(run.updatedAt).toLocaleString()}</li>
            </ul>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
