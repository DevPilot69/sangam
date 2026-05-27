import { apiFetchJson } from "./client";

export type ApiSubscription = {
  planCode: string | null;
  status: string;
  currentPeriodEnd: string | null;
  razorpayCustomerId: string | null;
  razorpaySubscriptionId: string | null;
  trialEndsAt: string | null;
} | null;

export type ApiTenant = {
  id: string;
  slug: string;
  companyCode: string | null;
  name: string;
  legalName: string | null;
  industry: string | null;
  country: string;
  /** Merged JSON workspace settings (company profile extensions, statutory, payroll prefs, etc.) */
  settings?: Record<string, unknown>;
  subscription?: ApiSubscription;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchTenant(token: string): Promise<ApiTenant> {
  return apiFetchJson<ApiTenant>("/v1/tenant", { method: "GET", token });
}

export type ApiDepartment = {
  id: string;
  name: string;
  code: string;
  headUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiDesignation = {
  id: string;
  title: string;
  grade: string | null;
  departmentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchDepartments(token: string): Promise<ApiDepartment[]> {
  return apiFetchJson<ApiDepartment[]>("/v1/tenant/departments", {
    method: "GET",
    token,
  });
}

export async function fetchDesignations(token: string): Promise<ApiDesignation[]> {
  return apiFetchJson<ApiDesignation[]>("/v1/tenant/designations", {
    method: "GET",
    token,
  });
}

export async function patchTenant(
  token: string,
  body: {
    name?: string;
    legalName?: string;
    industry?: string;
    country?: string;
    companyCode?: string;
  }
): Promise<ApiTenant> {
  return apiFetchJson<ApiTenant>("/v1/tenant", {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function patchTenantSettings(
  token: string,
  body: Record<string, unknown>
): Promise<ApiTenant> {
  return apiFetchJson<ApiTenant>("/v1/tenant/settings", {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function createDepartment(
  token: string,
  body: { name: string; code: string; headUserId?: string }
): Promise<ApiDepartment> {
  return apiFetchJson<ApiDepartment>("/v1/tenant/departments", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function createDesignation(
  token: string,
  body: { title: string; grade?: string; departmentId?: string }
): Promise<ApiDesignation> {
  return apiFetchJson<ApiDesignation>("/v1/tenant/designations", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function updateDepartment(
  token: string,
  id: string,
  body: { name?: string; code?: string; headUserId?: string | null }
): Promise<ApiDepartment> {
  return apiFetchJson<ApiDepartment>(`/v1/tenant/departments/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function deleteDepartment(token: string, id: string): Promise<unknown> {
  return apiFetchJson<unknown>(`/v1/tenant/departments/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function updateDesignation(
  token: string,
  id: string,
  body: { title?: string; grade?: string | null; departmentId?: string | null }
): Promise<ApiDesignation> {
  return apiFetchJson<ApiDesignation>(`/v1/tenant/designations/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function deleteDesignation(token: string, id: string): Promise<unknown> {
  return apiFetchJson<unknown>(`/v1/tenant/designations/${id}`, {
    method: "DELETE",
    token,
  });
}

export type CompleteOnboardingResult =
  | ApiTenant
  | { alreadyCompleted: true; onboardingCompletedAt: string };

export async function completeTenantOnboarding(token: string): Promise<CompleteOnboardingResult> {
  return apiFetchJson<CompleteOnboardingResult>("/v1/tenant/complete-onboarding", {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}
