/**
 * Pluggable error reporter. Lets the host application wire its own
 * Sentry / Datadog / Rollbar capture path without making api-kit depend on
 * any specific SDK.
 *
 * Usage (apps/web/sentry.server.config.ts):
 *
 *   import * as Sentry from "@sentry/nextjs";
 *   import { setErrorReporter } from "@sangam/api-kit";
 *   setErrorReporter((err, ctx) => Sentry.captureException(err, { extra: ctx }));
 */

export type ErrorReporter = (
  err: unknown,
  context: Record<string, unknown>,
) => void;

let reporter: ErrorReporter | null = null;

export function setErrorReporter(fn: ErrorReporter | null): void {
  reporter = fn;
}

export function reportError(
  err: unknown,
  context: Record<string, unknown>,
): void {
  if (!reporter) return;
  try {
    reporter(err, context);
  } catch {
    // never crash the request path because the reporter blew up.
  }
}
