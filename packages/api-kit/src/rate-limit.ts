import { TooManyRequestsError } from "./errors";

/**
 * In-memory sliding-window rate limiter. Replaces `@nestjs/throttler`'s global
 * 100req/60s guard (src/app.module.ts:35-40) for the time being.
 *
 * Limitation: state is per-Lambda-instance. On Vercel a user hitting different
 * cold lambdas can effectively bypass this. Acceptable during demo phases;
 * Phase 6 swaps the body for `@upstash/ratelimit` + Upstash Redis with the
 * SAME function signature so callers don't change.
 */

type Window = { count: number; resetAt: number };
const buckets = new Map<string, Window>();

export type RateLimitOptions = {
  /** Logical bucket name, e.g. "auth:login". */
  key: string;
  /** Max requests within `windowMs`. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Caller identity (IP or user id). */
  identity: string;
};

export async function rateLimit(opts: RateLimitOptions): Promise<void> {
  const composite = `${opts.key}:${opts.identity}`;
  const now = Date.now();
  const cur = buckets.get(composite);

  if (!cur || cur.resetAt <= now) {
    buckets.set(composite, { count: 1, resetAt: now + opts.windowMs });
    return;
  }

  cur.count += 1;
  if (cur.count > opts.limit) {
    const retryAfter = Math.max(0, Math.ceil((cur.resetAt - now) / 1000));
    throw new TooManyRequestsError(
      `Rate limit exceeded for ${opts.key}. Retry in ${retryAfter}s.`,
    );
  }
}

/**
 * Best-effort identity extraction from a NextRequest. Use the authenticated
 * user id when available, otherwise the client IP.
 */
export function identityFromRequest(
  req: Request,
  userId?: string,
): string {
  if (userId) return `u:${userId}`;
  // Vercel sets x-real-ip; fall back to x-forwarded-for first hop.
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return `ip:${realIp}`;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return `ip:${xff.split(",")[0].trim()}`;
  return "ip:unknown";
}
