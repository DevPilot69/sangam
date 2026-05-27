import type { PasswordManagerAccount, ResetPasswordResult } from "./password-manager";
import { apiFetchJson } from "./client";

export type PasswordManagerFilter = "all" | "tenant_admin" | "employee";

export async function fetchPlatformPasswordManagerAccounts(
  token: string,
  tenantId: string,
  type: PasswordManagerFilter = "all"
) {
  const q = type === "all" ? "" : `?type=${type}`;
  return apiFetchJson<PasswordManagerAccount[]>(
    `/v1/platform/tenants/${tenantId}/password-manager/accounts${q}`,
    { method: "GET", token }
  );
}

export async function resetPlatformUserPassword(token: string, tenantId: string, userId: string) {
  return apiFetchJson<ResetPasswordResult>(
    `/v1/platform/tenants/${tenantId}/password-manager/users/${userId}/reset-password`,
    { method: "POST", token, body: JSON.stringify({}) }
  );
}

export async function resetPlatformEmployeePassword(
  token: string,
  tenantId: string,
  employeeId: string
) {
  return apiFetchJson<ResetPasswordResult>(
    `/v1/platform/tenants/${tenantId}/password-manager/employees/${employeeId}/reset-password`,
    { method: "POST", token, body: JSON.stringify({}) }
  );
}

export async function patchPlatformTenantCompanyCode(
  token: string,
  tenantId: string,
  companyCode: string
) {
  return apiFetchJson<{ id: string; companyCode: string }>(
    `/v1/platform/tenants/${tenantId}/company-code`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({ companyCode }),
    }
  );
}
