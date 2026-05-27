// Sentry initialisation for the Node.js runtime (Route Handlers,
// Server Components, Server Actions). Loaded once per server instance.
// See https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { setErrorReporter } from "@sangam/api-kit";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT ??
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV,
    // Conservative defaults to keep within free-tier quota during demos.
    // Set SENTRY_FULL_TRACING=1 to sample 100% of requests instead.
    tracesSampleRate:
      process.env.SENTRY_FULL_TRACING === "1"
        ? 1.0
        : Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
  });

  // Bridge: withApi's catch-all surfaces non-ApiError 500s through this hook.
  // Sentry's auto-instrumentation only catches errors that escape; ours don't.
  setErrorReporter((err, context) => {
    Sentry.captureException(err, { extra: context });
  });
}
