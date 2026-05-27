import { apiFetchJson } from "./client";

export type ApiPayrollRunStatus =
  | "DRAFT"
  | "PROCESSING"
  | "PENDING"
  | "APPROVED"
  | "LOCKED"
  | "DISBURSED"
  | "ERROR";

export type ApiPayrollRun = {
  id: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;
  status: ApiPayrollRunStatus;
  employeeCount: number;
  excludedCount?: number;
  grossPay: number;
  totalDeductions: number;
  totalNet: number;
  initiatedById: string | null;
  initiatedByName: string | null;
  ackWarnings?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiPayrollEntry = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  gross: number;
  deductions: number;
  net: number;
};

export type ApiPayrollRunDetail = ApiPayrollRun & {
  excludedEmployeeIds?: string[];
  entries: ApiPayrollEntry[];
};

export type PayrollEmployeeIssue = {
  code: string;
  severity: "blocking" | "warning";
  message: string;
  field?: string;
};

export type PayrollSetupEmployee = {
  id: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  included: boolean;
  excluded: boolean;
  canInclude: boolean;
  suggestedExclude: boolean;
  issues: PayrollEmployeeIssue[];
  monthlyGrossEstimate: number;
  monthlyDeductionsEstimate: number;
  monthlyNetEstimate: number;
  fixHref: string;
  disbursement: {
    bankName: string | null;
    bankAccount: string | null;
    ifsc: string | null;
    paymentMethod: string;
    paymentMethodLabel: string;
    requiresBankTransfer: boolean;
  };
};

export type PayrollSetupResponse = {
  run: {
    id: string;
    periodYear: number;
    periodMonth: number;
    periodLabel: string;
    monthName: string;
    status: string;
    excludedEmployeeIds: string[];
    ackWarnings: boolean;
    ackWarningsReason: string | null;
    disbursementPaymentMethod: string;
    disbursementPaymentMethodLabel: string;
  };
  employees: PayrollSetupEmployee[];
  summary: {
    totalActive: number;
    includedCount: number;
    excludedCount: number;
    blockingExcluded: number;
    blockingStillIncluded: number;
    warningCount: number;
  };
};

export type PayrollValidationCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
  affectedCount?: number;
};

export type PayrollValidationResponse = {
  canProceed: boolean;
  blockingCount: number;
  warningCount: number;
  checks: PayrollValidationCheck[];
  blockingEmployees: Array<{
    id: string;
    employeeCode: string;
    employeeName: string;
    issues: PayrollEmployeeIssue[];
  }>;
  requiresWarningAck: boolean;
};

export type PayrollPreviewResponse = {
  run: PayrollSetupResponse["run"];
  entries: Array<{
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    departmentName: string | null;
    gross: number;
    deductions: number;
    net: number;
    bankName: string | null;
    bankAccount: string | null;
    ifsc: string | null;
    paymentMethod: string;
    paymentMethodLabel: string;
  }>;
  totals: { gross: number; deductions: number; net: number };
  excludedCount: number;
  disbursement: {
    defaultPaymentMethod: string;
    defaultPaymentMethodLabel: string;
    bankTransferCount: number;
  };
};

export type ApiPayrollTrendPoint = {
  month: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
};

export async function fetchPayrollRuns(
  token: string,
  params?: { limit?: number }
): Promise<ApiPayrollRun[]> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetchJson<ApiPayrollRun[]>(`/v1/payroll/runs${suffix}`, { method: "GET", token });
}

export async function fetchPayrollRun(
  token: string,
  id: string
): Promise<ApiPayrollRunDetail> {
  return apiFetchJson<ApiPayrollRunDetail>(`/v1/payroll/runs/${id}`, { method: "GET", token });
}

export async function createPayrollRun(
  token: string,
  body: { periodYear: number; periodMonth: number }
): Promise<PayrollSetupResponse> {
  return apiFetchJson<PayrollSetupResponse>("/v1/payroll/runs", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function fetchPayrollSetup(
  token: string,
  runId: string
): Promise<PayrollSetupResponse> {
  return apiFetchJson<PayrollSetupResponse>(`/v1/payroll/runs/${runId}/setup`, {
    method: "GET",
    token,
  });
}

export async function updatePayrollSetup(
  token: string,
  runId: string,
  body: {
    excludedEmployeeIds: string[];
    ackWarnings?: boolean;
    ackWarningsReason?: string;
    disbursementPaymentMethod?: string;
  }
): Promise<PayrollSetupResponse> {
  return apiFetchJson<PayrollSetupResponse>(`/v1/payroll/runs/${runId}/setup`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function validatePayrollRun(
  token: string,
  runId: string
): Promise<PayrollValidationResponse> {
  return apiFetchJson<PayrollValidationResponse>(`/v1/payroll/runs/${runId}/validate`, {
    method: "POST",
    token,
  });
}

export async function fetchPayrollPreview(
  token: string,
  runId: string
): Promise<PayrollPreviewResponse> {
  return apiFetchJson<PayrollPreviewResponse>(`/v1/payroll/runs/${runId}/preview`, {
    method: "GET",
    token,
  });
}

export async function finalizePayrollRun(
  token: string,
  runId: string
): Promise<ApiPayrollRunDetail> {
  return apiFetchJson<ApiPayrollRunDetail>(`/v1/payroll/runs/${runId}/finalize`, {
    method: "POST",
    token,
    body: JSON.stringify({ confirmText: "CONFIRM" }),
  });
}

export async function fetchPayrollTrend(token: string): Promise<ApiPayrollTrendPoint[]> {
  return apiFetchJson<ApiPayrollTrendPoint[]>("/v1/payroll/trend", { method: "GET", token });
}
