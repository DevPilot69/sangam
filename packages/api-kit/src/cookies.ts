/**
 * Refresh-token cookie helpers — single source of truth for the cookie name
 * and security flags. Mirrors `cookieOpts()` from the original NestJS auth
 * controller (vetan_v1-backend-main/src/modules/auth/auth.controller.ts:30-40).
 *
 * IMPORTANT: same-origin after the merge, so `SameSite=Lax` is the secure
 * default. (The old API used `SameSite=None` only because Vercel frontend
 * and Render backend were cross-origin.)
 */

export const REFRESH_COOKIE_NAME = "vetan_refresh";

export type CookieSerializeOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number; // seconds
  expires?: Date;
};

/** Default options for the refresh cookie at runtime. */
export function refreshCookieOptions(maxAgeMs: number): CookieSerializeOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor(maxAgeMs / 1000)),
  };
}

/** RFC 6265 Set-Cookie serializer (Next.js's cookies API works too; this is
 *  used when we need direct header control e.g. in low-level responses). */
export function serializeCookie(
  name: string,
  value: string,
  opts: CookieSerializeOptions = {},
): string {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (opts.sameSite) {
    parts.push(
      `SameSite=${opts.sameSite.charAt(0).toUpperCase()}${opts.sameSite.slice(1)}`,
    );
  }
  return parts.join("; ");
}
