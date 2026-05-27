import type { ApiDepartment, ApiDesignation } from "./tenant";
import { apiFetchJson } from "./client";

export async function fetchPlatformTenantDepartmentsFull(token: string, tenantId: string) {
  return apiFetchJson<ApiDepartment[]>(
    `/v1/platform/tenants/${tenantId}/org/departments`,
    { method: "GET", token }
  );
}

export async function createPlatformTenantDepartment(
  token: string,
  tenantId: string,
  body: { name: string; code: string; headUserId?: string }
) {
  return apiFetchJson<ApiDepartment>(`/v1/platform/tenants/${tenantId}/org/departments`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function updatePlatformTenantDepartment(
  token: string,
  tenantId: string,
  id: string,
  body: { name?: string; code?: string; headUserId?: string | null }
) {
  return apiFetchJson<ApiDepartment>(
    `/v1/platform/tenants/${tenantId}/org/departments/${id}`,
    { method: "PATCH", token, body: JSON.stringify(body) }
  );
}

export async function deletePlatformTenantDepartment(
  token: string,
  tenantId: string,
  id: string
) {
  return apiFetchJson<unknown>(`/v1/platform/tenants/${tenantId}/org/departments/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function fetchPlatformTenantDesignationsFull(token: string, tenantId: string) {
  return apiFetchJson<ApiDesignation[]>(
    `/v1/platform/tenants/${tenantId}/org/designations`,
    { method: "GET", token }
  );
}

export async function createPlatformTenantDesignation(
  token: string,
  tenantId: string,
  body: { title: string; grade?: string; departmentId?: string }
) {
  return apiFetchJson<ApiDesignation>(`/v1/platform/tenants/${tenantId}/org/designations`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function updatePlatformTenantDesignation(
  token: string,
  tenantId: string,
  id: string,
  body: { title?: string; grade?: string | null; departmentId?: string | null }
) {
  return apiFetchJson<ApiDesignation>(
    `/v1/platform/tenants/${tenantId}/org/designations/${id}`,
    { method: "PATCH", token, body: JSON.stringify(body) }
  );
}

export async function deletePlatformTenantDesignation(
  token: string,
  tenantId: string,
  id: string
) {
  return apiFetchJson<unknown>(`/v1/platform/tenants/${tenantId}/org/designations/${id}`, {
    method: "DELETE",
    token,
  });
}
