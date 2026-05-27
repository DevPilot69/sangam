import type { ApiPayrollRun, ApiPayrollRunStatus } from "@/lib/api/payroll";
import type { PayrollRunRow, PayrollRunStatus } from "@/types";

const STATUS_FROM_API: Record<ApiPayrollRunStatus, PayrollRunStatus> = {
  DRAFT: "draft",
  PROCESSING: "processing",
  PENDING: "pending",
  APPROVED: "approved",
  LOCKED: "locked",
  DISBURSED: "disbursed",
  ERROR: "error",
};

export function mapPayrollStatus(s: ApiPayrollRunStatus): PayrollRunStatus {
  return STATUS_FROM_API[s] ?? "draft";
}

export function apiPayrollRunToRow(r: ApiPayrollRun): PayrollRunRow {
  return {
    id: r.id,
    period: r.periodLabel,
    employeeCount: r.employeeCount,
    grossPay: r.grossPay,
    status: mapPayrollStatus(r.status),
    initiatedBy: r.initiatedByName ?? "—",
    date: r.updatedAt,
  };
}

export function apiPayrollRunsToRows(runs: ApiPayrollRun[]): PayrollRunRow[] {
  return runs.map(apiPayrollRunToRow);
}
