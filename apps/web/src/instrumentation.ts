// Next.js calls this on every server-side runtime startup. Loading the right
// Sentry config based on `NEXT_RUNTIME` keeps edge bundles small.
// See https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
