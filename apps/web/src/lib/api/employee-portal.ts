import { ApiError, apiFetchJson, getApiBaseUrl, pickErrorMessage } from "./client";

export type MeDashboard = {
  latestPayslip: {
    payrollRunId: string;
    periodYear: number;
    periodMonth: number;
    periodLabel: string;
    net: number;
    gross: number;
    deductions: number;
    status: string;
  } | null;
  leaveBalances: MeLeaveBalance[];
  pendingLeaveCount: number;
  recentPayslips: MePayslipSummary[];
};

export type MeLeaveBalance = {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  balanceDays: number;
  year: number;
};

export type MeHoliday = {
  id: string;
  date: string;
  name: string;
  source?: "platform" | "tenant";
};

export type MePayslipSummary = {
  payrollRunId: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;
  monthName: string;
  net: number;
  gross: number;
  deductions: number;
  status: string;
  hasPdf: boolean;
};

export type MePayslipLine = { label: string; amount: number };

export type MePayslipDetail = MePayslipSummary & {
  breakdown: Record<string, unknown> | null;
  earnings: MePayslipLine[];
  deductionLines: MePayslipLine[];
  earningsTotal: number;
  deductionsDetailSum: number;
  monthName: string;
  companyName: string;
  tenantSlug: string;
  employee: {
    code: string;
    name: string;
    dateOfJoining: string;
    designation: string | null;
    department: string | null;
    grade: string | null;
    pan: string | null;
    bankAccount: string | null;
    ifsc: string | null;
  };
};

export type MeLeaveRequest = {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string | null;
  status: string;
  createdAt: string;
};

export type MeLeaveType = {
  id: string;
  name: string;
  code: string;
  daysPerYear: number;
};

export type MeProfile = {
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    phoneAlt: string | null;
    aadhar: string | null;
    pan: string | null;
  } | null;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    dateOfJoining: string;
    pan: string | null;
    bankAccount: string | null;
    ifsc: string | null;
    department: string | null;
    designation: string | null;
    grade: string | null;
  };
  companyName: string;
  tenantSlug: string;
};

export type MeAttendanceRow = {
  id: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  remarks: string | null;
  source: string;
  detail: Record<string, unknown> | null;
};

export type MeAttendanceDefaultShift = {
  code: string;
  name: string;
  start: string;
  end: string;
  breakMinutes: number;
};

export type MeAttendanceDay = {
  date: string;
  dayOfMonth: number;
  weekday: number;
  status: string;
  calendarCode: string;
  checkIn: string | null;
  checkOut: string | null;
  remarks: string | null;
  source: string;
  detail: Record<string, unknown> | null;
  isHoliday: boolean;
  holidayName: string | null;
  isWeekend: boolean;
  needsRegularization: boolean;
};

export type MeAttendanceMonth = {
  year: number;
  month: number;
  monthLabel: string;
  defaultShift: MeAttendanceDefaultShift;
  exceptionDays: number;
  penaltyDays: number;
  insightsCount: number;
  days: MeAttendanceDay[];
};

export async function fetchMeDashboard(token: string) {
  return apiFetchJson<MeDashboard>("/v1/me/dashboard", { method: "GET", token });
}

export async function fetchMeProfile(token: string) {
  return apiFetchJson<MeProfile>("/v1/me/profile", { method: "GET", token });
}

export async function patchMeProfile(
  token: string,
  body: { phone?: string; phoneAlt?: string }
) {
  return apiFetchJson<MeProfile>("/v1/me/profile", {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function fetchMePayslips(token: string) {
  return apiFetchJson<MePayslipSummary[]>("/v1/me/payslips", { method: "GET", token });
}

export async function fetchMePayslipDetail(token: string, runId: string) {
  return apiFetchJson<MePayslipDetail>(`/v1/me/payslips/${runId}`, { method: "GET", token });
}

export async function downloadMePayslipPdf(token: string, runId: string, filename: string): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/v1/me/payslips/${runId}/pdf`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) {
    let json: Record<string, unknown> = {};
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      /* binary */
    }
    throw new ApiError(pickErrorMessage(json, res.statusText), res.status, json);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchMeLeaveBalances(token: string) {
  return apiFetchJson<MeLeaveBalance[]>("/v1/me/leave/balances", { method: "GET", token });
}

export async function fetchMeHolidays(token: string, year?: number) {
  const q = year != null ? `?year=${year}` : "";
  return apiFetchJson<MeHoliday[]>(`/v1/me/holidays${q}`, { method: "GET", token });
}

export async function fetchMeLeaveTypes(token: string) {
  return apiFetchJson<MeLeaveType[]>("/v1/me/leave/types", { method: "GET", token });
}

export async function fetchMeLeaveRequests(token: string) {
  return apiFetchJson<MeLeaveRequest[]>("/v1/me/leave/requests", { method: "GET", token });
}

export async function createMeLeaveRequest(
  token: string,
  body: { leaveTypeId: string; startDate: string; endDate: string; reason?: string }
) {
  return apiFetchJson<MeLeaveRequest>("/v1/me/leave/requests", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function cancelMeLeaveRequest(token: string, id: string) {
  return apiFetchJson<MeLeaveRequest>(`/v1/me/leave/requests/${id}/cancel`, {
    method: "PATCH",
    token,
  });
}

export async function fetchMeAttendance(
  token: string,
  params?: { from?: string; to?: string }
) {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetchJson<MeAttendanceRow[]>(`/v1/me/attendance${suffix}`, { method: "GET", token });
}

export async function fetchMeAttendanceMonth(token: string, year: number, month: number) {
  const q = new URLSearchParams({ year: String(year), month: String(month) });
  return apiFetchJson<MeAttendanceMonth>(`/v1/me/attendance/month?${q}`, { method: "GET", token });
}

export async function fetchMeAttendanceSummary(token: string, from: string, to: string) {
  return apiFetchJson<{ present: number; absent: number; late: number; wfh: number; totalRecords: number }>(
    `/v1/me/attendance/summary?from=${from}&to=${to}`,
    { method: "GET", token }
  );
}
