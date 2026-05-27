// Sentry init for the browser bundle. Next.js auto-imports this file.
// See https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      process.env.NODE_ENV,
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
    ),
    sendDefaultPii: false,
    // Replay is expensive; off by default. Toggle via env if you need session
    // replays for a specific debug session.
    replaysOnErrorSampleRate:
      process.env.NEXT_PUBLIC_SENTRY_ENABLE_REPLAY === "1" ? 1.0 : 0,
    replaysSessionSampleRate:
      process.env.NEXT_PUBLIC_SENTRY_ENABLE_REPLAY === "1" ? 0.05 : 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
