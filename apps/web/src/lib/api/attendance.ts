import { apiFetchJson } from "./client";

export type AttendancePreset = "today" | "yesterday" | "week" | "month" | "range";

export type AttendanceStatusFilter = "PRESENT" | "ABSENT" | "LATE" | "WFH";

export type ApiAttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  remarks: string | null;
  source: string;
  detail: string | null;
};

export type ApiAttendanceSummary = {
  present: number;
  absent: number;
  late: number;
  wfh: number;
  totalRecords: number;
  from?: string;
  to?: string;
};

export type AttendanceQueryParams = {
  from?: string;
  to?: string;
  limit?: number;
  employeeId?: string;
  search?: string;
  date?: string;
  month?: string;
  preset?: AttendancePreset;
  status?: AttendanceStatusFilter;
};

function buildQuery(params?: AttendanceQueryParams): string {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.employeeId) q.set("employeeId", params.employeeId);
  if (params?.search) q.set("search", params.search);
  if (params?.date) q.set("date", params.date);
  if (params?.month) q.set("month", params.month);
  if (params?.preset) q.set("preset", params.preset);
  if (params?.status) q.set("status", params.status);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchAttendanceMonths(
  token: string
): Promise<{ months: string[] }> {
  return apiFetchJson<{ months: string[] }>("/v1/attendance/months", {
    method: "GET",
    token,
  });
}

export async function fetchAttendanceRecords(
  token: string,
  params?: AttendanceQueryParams
): Promise<ApiAttendanceRecord[]> {
  return apiFetchJson<ApiAttendanceRecord[]>(`/v1/attendance${buildQuery(params)}`, {
    method: "GET",
    token,
  });
}

export async function fetchAttendanceSummary(
  token: string,
  params?: AttendanceQueryParams
): Promise<ApiAttendanceSummary> {
  return apiFetchJson<ApiAttendanceSummary>(
    `/v1/attendance/summary${buildQuery(params)}`,
    { method: "GET", token }
  );
}
