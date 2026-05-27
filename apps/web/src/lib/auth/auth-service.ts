import { apiFetchJson, ApiError } from "@/lib/api/client";
import type { User, UserRole } from "@/types";

export { ApiError };

type BackendAuthUser = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  phoneAlt?: string | null;
  aadhar?: string | null;
  pan?: string | null;
  tenantId: string;
  tenantSlug: string;
  companyName?: string;
  roles: string[];
  permissions?: string[];
  onboardingComplete: boolean;
  emailVerifiedAt?: string | null;
};

function mapRole(roles: string[]): UserRole {
  const upper = roles.map((r) => r.toUpperCase());
  if (upper.includes("EMPLOYEE")) return "employee";
  if (
    upper.includes("ADMIN") ||
    upper.includes("TENANT_ADMIN") ||
    upper.includes("HR_MANAGER") ||
    upper.includes("FINANCE_MANAGER") ||
    upper.includes("MANAGER")
  ) {
    return "admin";
  }
  return "admin";
}

function toUser(b: BackendAuthUser): User {
  return {
    id: b.id,
    email: b.email,
    name: b.name,
    role: mapRole(b.roles ?? []),
    companyName: b.companyName ?? b.tenantSlug,
    onboardingComplete: b.onboardingComplete,
    tenantId: b.tenantId,
    tenantSlug: b.tenantSlug,
    permissions: b.permissions ?? [],
    phone: b.phone ?? undefined,
    phoneAlt: b.phoneAlt ?? undefined,
    aadhar: b.aadhar ?? undefined,
    pan: b.pan ?? undefined,
  };
}

export async function login(
  tenantSlug: string,
  login: string,
  password: string
): Promise<{ user: User; token: string }> {
  const data = await apiFetchJson<{ accessToken: string; user: BackendAuthUser }>(
    "/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        tenantSlug: tenantSlug.trim().toLowerCase(),
        login: login.trim(),
        password,
      }),
    }
  );
  return { user: toUser({ ...data.user, permissions: data.user.permissions ?? [] }), token: data.accessToken };
}

export async function fetchSessionUser(token: string): Promise<User> {
  const u = await apiFetchJson<BackendAuthUser>("/v1/auth/me", {
    method: "GET",
    token,
  });
  return toUser({ ...u, permissions: u.permissions ?? [] });
}

export async function register(body: {
  name: string;
  companyName: string;
  email: string;
  password: string;
}): Promise<{ tenantSlug: string }> {
  const data = await apiFetchJson<{ user: { tenantSlug: string } }>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: body.name.trim(),
      companyName: body.companyName.trim(),
      email: body.email.trim().toLowerCase(),
      password: body.password,
    }),
  });
  return { tenantSlug: data.user.tenantSlug };
}

export async function forgotPassword(
  tenantSlug: string,
  email: string
): Promise<{ ok: true }> {
  await apiFetchJson("/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      tenantSlug: tenantSlug.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
    }),
  });
  return { ok: true };
}

export async function resetPassword(
  token: string,
  password: string
): Promise<{ ok: true }> {
  await apiFetchJson("/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
  return { ok: true };
}

export async function verifyEmail(
  tenantSlug: string,
  email: string,
  code: string
): Promise<{ ok: true }> {
  await apiFetchJson("/v1/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({
      tenantSlug: tenantSlug.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      code,
    }),
  });
  return { ok: true };
}

export async function logout(): Promise<void> {
  try {
    await apiFetchJson("/v1/auth/logout", { method: "POST" });
  } catch {
    /* ignore network errors on sign-out */
  }
}

export async function patchAuthProfile(
  token: string,
  body: {
    name?: string;
    email?: string;
    phone?: string;
    phoneAlt?: string;
    aadhar?: string;
    pan?: string;
  }
): Promise<User> {
  const u = await apiFetchJson<BackendAuthUser>("/v1/auth/profile", {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
  return toUser({ ...u, permissions: u.permissions ?? [] });
}

export async function changeAuthPassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true }> {
  return apiFetchJson<{ ok: true }>("/v1/auth/change-password", {
    method: "POST",
    token,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
