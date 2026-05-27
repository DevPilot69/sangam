import { apiFetchJson } from "./client";

export type ApiDashboardSummary = {
  totalPayrollMonth: number;
  activeEmployees: number;
  pendingApprovals: number;
  daysToPayroll: number;
  payrollTrend: { month: string; amount: number }[];
};

export async function fetchDashboardSummary(token: string): Promise<ApiDashboardSummary> {
  return apiFetchJson<ApiDashboardSummary>("/v1/dashboard/summary", { method: "GET", token });
}
