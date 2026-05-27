import { fetchDashboardSummary, type ApiDashboardSummary } from "@/lib/api/dashboard";

export const dashboardRepository = {
  summary: (token: string): Promise<ApiDashboardSummary> => fetchDashboardSummary(token),
};

export type { ApiDashboardSummary };
