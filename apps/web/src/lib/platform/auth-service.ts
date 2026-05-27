import { apiFetchJson, ApiError } from "@/lib/api/client";
import type { PlatformUser } from "./auth-store";

export { ApiError };

type PlatformLoginResponse = {
  accessToken: string;
  user: PlatformUser;
};

export async function platformLogin(
  email: string,
  password: string
): Promise<{ user: PlatformUser; token: string }> {
  const data = await apiFetchJson<PlatformLoginResponse>("/v1/platform/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  return { user: data.user, token: data.accessToken };
}

export async function fetchPlatformSessionUser(token: string): Promise<PlatformUser> {
  return apiFetchJson<PlatformUser>("/v1/platform/auth/me", { method: "GET", token });
}
