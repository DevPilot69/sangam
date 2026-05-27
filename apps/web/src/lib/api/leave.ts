import { apiFetchJson } from "./client";

export type ApiLeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type ApiLeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string | null;
  status: ApiLeaveRequestStatus;
  createdAt: string;
};

export type ApiLeaveBalance = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeName: string;
  balanceDays: number;
  year: number;
};

export async function fetchLeaveRequests(
  token: string,
  params?: { status?: ApiLeaveRequestStatus; limit?: number }
): Promise<ApiLeaveRequest[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetchJson<ApiLeaveRequest[]>(`/v1/leave/requests${suffix}`, { method: "GET", token });
}

export async function fetchLeaveBalances(token: string): Promise<ApiLeaveBalance[]> {
  return apiFetchJson<ApiLeaveBalance[]>("/v1/leave/balances", { method: "GET", token });
}

export async function patchLeaveRequestStatus(
  token: string,
  id: string,
  status: "APPROVED" | "REJECTED"
): Promise<ApiLeaveRequest> {
  return apiFetchJson<ApiLeaveRequest>(`/v1/leave/requests/${id}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  });
}
