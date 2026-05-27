import {
  fetchPayrollRun,
  fetchPayrollRuns,
  fetchPayrollTrend,
  type ApiPayrollRun,
  type ApiPayrollRunDetail,
  type ApiPayrollTrendPoint,
} from "@/lib/api/payroll";
import { apiPayrollRunsToRows } from "@/lib/mappers/payroll.mapper";
import type { PayrollRunRow } from "@/types";

export const payrollRepository = {
  listRuns: (token: string, params?: { limit?: number }) => fetchPayrollRuns(token, params),

  listRunRows: async (token: string, params?: { limit?: number }): Promise<PayrollRunRow[]> => {
    const runs = await fetchPayrollRuns(token, params);
    return apiPayrollRunsToRows(runs);
  },

  getRun: (token: string, id: string): Promise<ApiPayrollRunDetail> => fetchPayrollRun(token, id),

  trend: (token: string): Promise<ApiPayrollTrendPoint[]> => fetchPayrollTrend(token),
};

export type { ApiPayrollRun, ApiPayrollRunDetail, ApiPayrollTrendPoint };
