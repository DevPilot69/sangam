import pino, { type Logger } from "pino";

/**
 * Structured logging with `pino`. Replaces the old NestJS AppLoggerModule
 * (src/shared/logger/app-logger.module.ts in the old backend) and the
 * console.log scatter we had during the migration phases.
 *
 * Output goes to stdout as one JSON object per line — exactly what Vercel
 * Logs, Axiom and Logtail ingest natively. No transport configuration is
 * needed for the serverless path; transports would spawn a worker thread
 * which is fragile on Vercel cold starts.
 *
 * Each Route Handler gets a per-request child logger via `withApi`. Children
 * inherit the request id so every line emitted while serving a request is
 * trivially correlatable.
 *
 * Example:
 *   import { logger } from "@sangam/api-kit";
 *   logger.info({ tenantId }, "billing.checkout created");
 *
 *   // inside a handler, prefer the request-scoped logger:
 *   export const POST = withApi(async (req, ctx, log) => {
 *     log.info({ planCode }, "creating subscription");
 *   });
 */

const isProd = process.env.NODE_ENV === "production";

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  base: {
    service: "sangam-web",
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
    ],
    censor: "[REDACTED]",
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

/** Create a child logger bound to a single request. */
export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

export type { Logger };
