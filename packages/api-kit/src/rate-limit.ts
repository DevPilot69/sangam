import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { TooManyRequestsError } from "./errors";

/**
 * Distributed rate limiter — Upstash Redis with in-memory fallback.
 *
 * Replaces `@nestjs/throttler`'s global 100req/60s guard
 * (src/app.module.ts:35-40 in the old NestJS app).
 *
 * Strategy:
 *   - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set in env, every
 *     `rateLimit()` call goes through `@upstash/ratelimit` (sliding-window) which
 *     gives you a single source of truth across all Vercel lambdas. This is the
 *     correct production path on Vercel because state is shared.
 *   - Otherwise we fall back to a per-lambda in-memory sliding window. Good for
 *     local dev / preview deploys without Redis configured, but be aware state
 *     is per-Lambda-instance so a user hitting different cold lambdas can
 *     effectively bypass the limit.
 *
 * Function signature is unchanged from Phase 1 so callers don't need to update.
 */

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

// --- in-memory fallback ----------------------------------------------------

type Window = { count: number; resetAt: number };
const buckets = new Map<string, Window>();

function memoryRateLimit(opts: RateLimitOptions): void {
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

// --- Upstash --------------------------------------------------------------

let cachedRedis: Redis | null = null;
const limiterCache = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (cachedRedis) return cachedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

function getLimiter(key: string, limit: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${key}:${limit}:${windowMs}`;
  const existing = limiterCache.get(cacheKey);
  if (existing) return existing;
  // `slidingWindow(limit, "<n> ms")` is supported by @upstash/ratelimit.
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    analytics: false,
    prefix: "sangam:ratelimit",
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

async function upstashRateLimit(
  opts: RateLimitOptions,
  limiter: Ratelimit,
): Promise<void> {
  const composite = `${opts.key}:${opts.identity}`;
  const res = await limiter.limit(composite);
  if (!res.success) {
    const retryAfter = Math.max(0, Math.ceil((res.reset - Date.now()) / 1000));
    throw new TooManyRequestsError(
      `Rate limit exceeded for ${opts.key}. Retry in ${retryAfter}s.`,
    );
  }
}

// --- public api -----------------------------------------------------------

export async function rateLimit(opts: RateLimitOptions): Promise<void> {
  const limiter = getLimiter(opts.key, opts.limit, opts.windowMs);
  if (limiter) {
    try {
      await upstashRateLimit(opts, limiter);
      return;
    } catch (err) {
      // If the limiter itself rejected (TooManyRequests) bubble up.
      if (err instanceof TooManyRequestsError) throw err;
      // Any other error (Redis down, network blip, etc.) — degrade gracefully
      // to the in-memory limiter rather than letting users through unbounded.
      // eslint-disable-next-line no-console
      console.warn("[rateLimit] Upstash failed, falling back to memory:", err);
    }
  }
  memoryRateLimit(opts);
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
