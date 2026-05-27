import { useAuthStore } from "@/lib/auth/auth-store";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Nest ValidationPipe / HttpException bodies often use `message: string[]`. */
export function pickErrorMessage(json: Record<string, unknown>, fallback: string): string {
  const err = json?.error as Record<string, unknown> | undefined;
  const top = err?.message;
  if (typeof top === "string" && top.trim()) return top.trim();
  if (Array.isArray(top) && top.length > 0) {
    return top.map(String).filter(Boolean).join("; ");
  }
  const details = err?.details as Record<string, unknown> | undefined;
  const dMsg = details?.message;
  if (typeof dMsg === "string" && dMsg.trim()) return dMsg.trim();
  if (Array.isArray(dMsg) && dMsg.length > 0) {
    return dMsg.map(String).filter(Boolean).join("; ");
  }
  const legacy = json?.message;
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  return fallback;
}

function getBaseUrl(): string {
  // Empty (or unset) -> same-origin / relative URLs. This is the production
  // deployment shape (Next.js + ported API together on Vercel). Setting an
  // explicit value still works (used by local dev when the API is on a
  // different port, e.g. legacy NestJS host).
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
}

/** Public base URL for custom fetch (e.g. multipart uploads, binary downloads). */
export function getApiBaseUrl(): string {
  return getBaseUrl();
}

/** Paths where 401 means invalid credentials / no session — never call refresh. */
const AUTH_PATHS_NO_REFRESH = new Set([
  "/v1/auth/login",
  "/v1/auth/register",
  "/v1/auth/refresh",
  "/v1/auth/logout",
  "/v1/auth/forgot-password",
  "/v1/auth/reset-password",
  "/v1/auth/verify-email",
  "/v1/platform/auth/login",
]);

function pathWithoutQuery(p: string): string {
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  const i = withSlash.indexOf("?");
  return i === -1 ? withSlash : withSlash.slice(0, i);
}

function shouldTryRefreshOn401(path: string): boolean {
  return !AUTH_PATHS_NO_REFRESH.has(pathWithoutQuery(path));
}

async function fetchNewAccessTokenFromRefreshCookie(): Promise<string | null> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!res.ok || json.success !== true) return null;
  const data = json.data as { accessToken?: unknown } | undefined;
  const t = data?.accessToken;
  return typeof t === "string" && t.length > 0 ? t : null;
}

let refreshSingleFlight: Promise<string | null> | null = null;

function refreshAccessTokenSingleFlight(): Promise<string | null> {
  if (!refreshSingleFlight) {
    refreshSingleFlight = fetchNewAccessTokenFromRefreshCookie().finally(() => {
      refreshSingleFlight = null;
    });
  }
  return refreshSingleFlight;
}

export type ApiFetchInit = RequestInit & {
  token?: string | null;
  /** @internal avoids refresh loops */
  _authRetried?: boolean;
};

/** POST/GET etc. to Vetan API; unwraps `{ success, data }`. Uses cookies when `credentials` default include. */
export async function apiFetchJson<T>(
  path: string,
  init: ApiFetchInit = {}
): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const { token, _authRetried, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (!headers.has("Content-Type") && rest.body != null) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...rest,
    headers,
    credentials: "include",
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty body */
  }

  if (
    res.status === 401 &&
    !_authRetried &&
    shouldTryRefreshOn401(path) &&
    typeof window !== "undefined"
  ) {
    const next = await refreshAccessTokenSingleFlight();
    if (next) {
      useAuthStore.getState().setToken(next);
      return apiFetchJson<T>(path, { ...init, token: next, _authRetried: true });
    }
    useAuthStore.getState().clearAuth();
  }

  if (!res.ok) {
    throw new ApiError(
      pickErrorMessage(json, res.statusText),
      res.status,
      json
    );
  }

  if (json.success !== true) {
    throw new ApiError(
      pickErrorMessage(json, "Request failed"),
      res.status,
      json
    );
  }

  return json.data as T;
}
