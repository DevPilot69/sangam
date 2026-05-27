// Sentry initialisation for the Edge runtime (middleware, edge route handlers).
// All Sangam route handlers run on the Node.js runtime today; this exists so
// that if/when we move to edge for any /v1/_health-style ping endpoint, errors
// from that runtime are still captured.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT ??
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
  });
}
