import type {
  ApiEmployeeDetail,
  ApiPaginatedEmployees,
  EmployeeListParams,
} from "./employees";
import { apiFetchJson } from "./client";

export type PlatformOrgDepartment = { id: string; name: string; code: string };
export type PlatformOrgDesignation = {
  id: string;
  title: string;
  departmentId: string | null;
};

export async function fetchPlatformTenantDepartments(token: string, tenantId: string) {
  return apiFetchJson<PlatformOrgDepartment[]>(
    `/v1/platform/tenants/${tenantId}/org/departments`,
    { method: "GET", token }
  );
}

export async function fetchPlatformTenantDesignations(token: string, tenantId: string) {
  return apiFetchJson<PlatformOrgDesignation[]>(
    `/v1/platform/tenants/${tenantId}/org/designations`,
    { method: "GET", token }
  );
}

export async function fetchPlatformTenantEmployees(
  token: string,
  tenantId: string,
  params: EmployeeListParams = {}
) {
  const q = new URLSearchParams();
  if (params.page != null) q.set("page", String(params.page));
  if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.record) q.set("record", params.record);
  if (params.status) q.set("status", params.status);
  const qs = q.toString();
  return apiFetchJson<ApiPaginatedEmployees>(
    `/v1/platform/tenants/${tenantId}/employees${qs ? `?${qs}` : ""}`,
    { method: "GET", token }
  );
}

export async function fetchPlatformTenantEmployee(
  token: string,
  tenantId: string,
  employeeId: string,
  opts?: { revealBank?: boolean }
) {
  const q = opts?.revealBank ? "?reveal=bank" : "";
  return apiFetchJson<ApiEmployeeDetail>(
    `/v1/platform/tenants/${tenantId}/employees/${employeeId}${q}`,
    { method: "GET", token }
  );
}

export async function createPlatformTenantEmployee(
  token: string,
  tenantId: string,
  body: Record<string, unknown>
) {
  return apiFetchJson<ApiEmployeeDetail>(`/v1/platform/tenants/${tenantId}/employees`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function updatePlatformTenantEmployee(
  token: string,
  tenantId: string,
  employeeId: string,
  body: Record<string, unknown>
) {
  return apiFetchJson<ApiEmployeeDetail>(
    `/v1/platform/tenants/${tenantId}/employees/${employeeId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(body),
    }
  );
}

export async function updatePlatformTenantEmployeeBank(
  token: string,
  tenantId: string,
  employeeId: string,
  body: Record<string, unknown>
) {
  return apiFetchJson<ApiEmployeeDetail>(
    `/v1/platform/tenants/${tenantId}/employees/${employeeId}/bank-details`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(body),
    }
  );
}

export async function deletePlatformTenantEmployee(
  token: string,
  tenantId: string,
  employeeId: string
) {
  return apiFetchJson<{ id: string; deleted: boolean }>(
    `/v1/platform/tenants/${tenantId}/employees/${employeeId}`,
    { method: "DELETE", token }
  );
}
