import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { PermissionCode } from "@sangam/contracts";
import { ForbiddenError, UnauthorizedError } from "./errors";

/**
 * Verifies an access JWT from the Authorization header and (optionally)
 * checks that the user holds all of the required permission codes.
 *
 * Replaces:
 *   - @UseGuards(AuthGuard('jwt'))    -> JWT signature + expiry check
 *   - @UseGuards(PermissionsGuard)    -> permission code intersection
 *   - @CurrentUser()                  -> returns the decoded payload
 *
 * Original behaviour:
 *   - src/modules/auth/strategies/jwt.strategy.ts (Bearer extraction + verify)
 *   - src/shared/guards/permissions.guard.ts      (permissions guard)
 *   - src/shared/decorators/require-permission.decorator.ts
 *
 * Failure modes match Nest verbatim:
 *   - Missing/expired/invalid token  -> 401 Unauthorized
 *   - Missing required permission    -> 403 Forbidden "Missing permission: <code>"
 *
 * Note: refresh is handled by the dedicated `/v1/auth/refresh` endpoint, which
 * the frontend client (apps/web/src/lib/api/client.ts) calls automatically on
 * any 401. So this helper does NOT attempt refresh — it just rejects 401 and
 * lets the client's retry loop drive the refresh.
 */
export type AccessTokenPayload = {
  sub: string;
  email: string;
  scope: "tenant" | "platform";
  /** Empty string for platform-scoped tokens */
  tenantId: string;
  employeeId?: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
};

const encoder = new TextEncoder();

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or shorter than 32 chars — refusing to verify tokens",
    );
  }
  return encoder.encode(secret);
}

function extractBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

export type RequireAuthOptions = {
  /** Permission codes required (logical AND). Use empty/omitted for any logged-in user. */
  permissions?: ReadonlyArray<PermissionCode | string>;
  /** Restrict to a particular scope. Default: accepts both. */
  scope?: "tenant" | "platform";
};

export async function requireAuth(
  req: NextRequest,
  opts: ReadonlyArray<PermissionCode | string> | RequireAuthOptions = {},
): Promise<AccessTokenPayload> {
  const options: RequireAuthOptions = Array.isArray(opts)
    ? { permissions: opts as ReadonlyArray<PermissionCode | string> }
    : (opts as RequireAuthOptions);

  const token = extractBearer(req);
  if (!token) throw new UnauthorizedError();

  let payload: AccessTokenPayload;
  try {
    const verified = await jwtVerify(token, getJwtSecret());
    payload = verified.payload as unknown as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError();
  }

  const scope = payload.scope ?? "tenant";
  const normalized: AccessTokenPayload = {
    ...payload,
    scope,
    permissions: payload.permissions ?? [],
    roles: payload.roles ?? [],
  };

  if (options.scope && normalized.scope !== options.scope) {
    throw new ForbiddenError(
      options.scope === "platform"
        ? "Platform access required"
        : "Tenant access required",
    );
  }

  if (options.permissions && options.permissions.length > 0) {
    const granted = new Set(normalized.permissions);
    for (const code of options.permissions) {
      if (!granted.has(code)) {
        throw new ForbiddenError(`Missing permission: ${code}`);
      }
    }
  }

  return normalized;
}

/** Tag a token as platform-scoped — useful for super-admin endpoints. */
export async function requirePlatformAuth(
  req: NextRequest,
): Promise<AccessTokenPayload> {
  return requireAuth(req, { scope: "platform" });
}
