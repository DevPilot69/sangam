/**
 * @deprecated Use API + repositories (`@/lib/repositories/*`) instead.
 * Kept only for backwards compatibility during migration.
 */
import type { EmployeeRow, PayrollRunRow } from "@/types";

export const mockEmployees: EmployeeRow[] = [];
export const mockPayrollRuns: PayrollRunRow[] = [];
export const dashboardTrend: { month: string; amount: number }[] = [];
