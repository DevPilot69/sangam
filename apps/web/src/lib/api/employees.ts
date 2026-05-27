import { apiFetchJson } from "./client";

export type ApiEmploymentStatus =
  | "ACTIVE"
  | "ON_LEAVE"
  | "NOTICE"
  | "INACTIVE";

export type ApiEmployeeListItem = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: ApiEmploymentStatus;
  departmentId: string | null;
  designationId: string | null;
  dateOfJoining: string;
  ctcAnnual: number | null;
  departmentName: string | null;
  designationTitle: string | null;
  /** ISO timestamp when soft-deleted (deactivated); null if active */
  deactivatedAt: string | null;
};

export type ApiPaginatedEmployees = {
  items: ApiEmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type EmployeePortalCredentials = {
  username: string;
  defaultPassword: string;
  workspaceSlug: string;
  companyCode: string;
};

export type ApiEmployeeDetail = {
  id: string;
  tenantId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: ApiEmploymentStatus;
  departmentId: string | null;
  designationId: string | null;
  departmentName: string | null;
  designationTitle: string | null;
  dateOfJoining: string;
  ctcAnnual: number | null;
  pan: string | null;
  bankName: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  salaryPaymentMethod?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string | null;
  portalCredentials?: EmployeePortalCredentials;
};

export type EmployeeRecordScope = "active" | "deactivated" | "all";

export type EmployeeListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  record?: EmployeeRecordScope;
  status?: ApiEmploymentStatus;
  departmentId?: string;
  designationId?: string;
  dateOfJoiningFrom?: string;
  dateOfJoiningTo?: string;
};

function appendEmployeeListQuery(
  q: URLSearchParams,
  params: EmployeeListParams
): void {
  if (params.page != null) q.set("page", String(params.page));
  if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.record) q.set("record", params.record);
  if (params.status) q.set("status", params.status);
  if (params.departmentId?.trim()) q.set("departmentId", params.departmentId.trim());
  if (params.designationId?.trim()) q.set("designationId", params.designationId.trim());
  if (params.dateOfJoiningFrom?.trim())
    q.set("dateOfJoiningFrom", params.dateOfJoiningFrom.trim());
  if (params.dateOfJoiningTo?.trim())
    q.set("dateOfJoiningTo", params.dateOfJoiningTo.trim());
}

export async function fetchEmployees(
  token: string,
  params: EmployeeListParams = {}
): Promise<ApiPaginatedEmployees> {
  const q = new URLSearchParams();
  appendEmployeeListQuery(q, params);
  const qs = q.toString();
  return apiFetchJson<ApiPaginatedEmployees>(
    `/v1/employees${qs ? `?${qs}` : ""}`,
    { method: "GET", token }
  );
}

export async function fetchEmployee(
  token: string,
  id: string,
  opts?: { revealBank?: boolean }
): Promise<ApiEmployeeDetail> {
  const q =
    opts?.revealBank === true ? "?reveal=bank" : "";
  return apiFetchJson<ApiEmployeeDetail>(`/v1/employees/${id}${q}`, {
    method: "GET",
    token,
  });
}

export async function createEmployee(
  token: string,
  body: Record<string, unknown>
): Promise<ApiEmployeeDetail> {
  return apiFetchJson<ApiEmployeeDetail>("/v1/employees", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function updateEmployee(
  token: string,
  id: string,
  body: Record<string, unknown>
): Promise<ApiEmployeeDetail> {
  return apiFetchJson<ApiEmployeeDetail>(`/v1/employees/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function updateEmployeeBank(
  token: string,
  id: string,
  body: Record<string, unknown>
): Promise<ApiEmployeeDetail> {
  return apiFetchJson<ApiEmployeeDetail>(`/v1/employees/${id}/bank-details`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function deleteEmployee(
  token: string,
  id: string
): Promise<{ id: string; deleted: boolean }> {
  return apiFetchJson(`/v1/employees/${id}`, { method: "DELETE", token });
}

export type ApiEmployeeExportRow = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: ApiEmploymentStatus;
  dateOfJoining: string;
  departmentCode: string;
  departmentName: string;
  designationTitle: string;
  ctcAnnual: number | null;
  pan: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  deactivatedAt: string | null;
};

export async function fetchEmployeesExport(
  token: string,
  params: EmployeeListParams = {}
): Promise<ApiEmployeeExportRow[]> {
  const q = new URLSearchParams();
  appendEmployeeListQuery(q, params);
  const qs = q.toString();
  return apiFetchJson<ApiEmployeeExportRow[]>(
    `/v1/employees/export${qs ? `?${qs}` : ""}`,
    { method: "GET", token }
  );
}

export type EmployeeBulkImportRow = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfJoining: string;
  employeeCode?: string;
  departmentCode?: string;
  designationTitle?: string;
  status?: ApiEmploymentStatus;
  ctcAnnual?: number;
  pan?: string;
  bankAccount?: string;
  ifsc?: string;
};

export type BulkImportEmployeesResult = {
  created: number;
  failed: Array<{ index: number; message: string }>;
};

export async function bulkImportEmployees(
  token: string,
  rows: EmployeeBulkImportRow[]
): Promise<BulkImportEmployeesResult> {
  return apiFetchJson<BulkImportEmployeesResult>("/v1/employees/bulk", {
    method: "POST",
    token,
    body: JSON.stringify({ rows }),
  });
}
