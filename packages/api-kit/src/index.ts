/**
 * @sangam/api-kit — the five cross-cutting helpers that replicate every
 * Nest "global" behaviour (interceptor / filter / guard / pipe / middleware).
 *
 *   withApi      — wraps a Route Handler. Runs the body, wraps successes in
 *                  { success, data, timestamp }, and traps errors into the
 *                  { success: false, error, timestamp, requestId } envelope.
 *                  Replaces TransformResponseInterceptor + HttpExceptionFilter
 *                  + RequestIdInterceptor + DemoSimulationInterceptor.
 *
 *   requireAuth  — verifies the Authorization bearer JWT (and on 401, lets the
 *                  client retry against /v1/auth/refresh which reads the
 *                  vetan_refresh httpOnly cookie). Replaces AuthGuard('jwt')
 *                  + PermissionsGuard.
 *
 *   validate     — Zod-based body/query/param validation that mirrors the
 *                  global ValidationPipe (whitelist + forbidNonWhitelisted
 *                  + transform + class-validator's per-decorator error
 *                  message format).
 *
 *   rateLimit    — drop-in throttler. Phase 1 ships an in-memory implementation;
 *                  Phase 6 swaps it for Upstash Redis.
 *
 *   withRawBody  — wrapper for raw-body routes (Razorpay webhook). Replaces
 *                  the `app.use('/v1/billing/webhooks/razorpay', raw(...))`
 *                  setup in the old NestJS main.ts.
 *
 * Helpers are stubbed in Phase 0 and fully implemented in Phase 1.
 */

export * from "./errors";
export * from "./envelope";
export * from "./validate";
export * from "./require-auth";
export * from "./sign-jwt";
export * from "./rate-limit";
export * from "./with-raw-body";
export * from "./cookies";
export * from "./logger";
export * from "./error-reporter";
