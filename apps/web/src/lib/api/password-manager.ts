import { apiFetchJson } from "./client";

export type PasswordManagerAccount = {
  userId: string | null;
  employeeId: string | null;
  accountType: "tenant_admin" | "employee";
  name: string;
  email: string;
  employeeCode: string | null;
  hasLogin: boolean;
  loginUsername: string | null;
  defaultPassword: string;
};

export type ResetPasswordResult = {
  ok: true;
  userId: string;
  employeeId?: string;
  portalCreated?: boolean;
  username: string;
  defaultPassword: string;
};

export type EmployeePortalCredentials = {
  username: string;
  defaultPassword: string;
  workspaceSlug: string;
  companyCode: string;
};

export async function fetchTenantPasswordManagerEmployees(token: string) {
  return apiFetchJson<PasswordManagerAccount[]>("/v1/tenant/password-manager/employees", {
    method: "GET",
    token,
  });
}

export async function resetTenantEmployeePassword(token: string, employeeId: string) {
  return apiFetchJson<ResetPasswordResult>(
    `/v1/tenant/password-manager/employees/${employeeId}/reset-password`,
    { method: "POST", token, body: JSON.stringify({}) }
  );
}

export async function resetTenantUserPassword(token: string, userId: string) {
  return apiFetchJson<ResetPasswordResult>(
    `/v1/tenant/password-manager/users/${userId}/reset-password`,
    { method: "POST", token, body: JSON.stringify({}) }
  );
}
