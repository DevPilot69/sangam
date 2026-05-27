import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Required for `node` runtime route handlers that pull in @prisma/client and
  // any other modules with native bindings or dynamic requires. Without this
  // Next's bundler may inline them and break at runtime.
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "bcryptjs",
    "pdfkit",
  ],
  // Standalone output dramatically reduces the Vercel function bundle size for
  // each Route Handler and is required for some deployment targets.
  output: "standalone",
  // Frontend workspace packages are TS-first; let Next transpile them.
  transpilePackages: ["@sangam/contracts", "@sangam/api-kit", "@sangam/demo"],
  // typedRoutes moved out of `experimental` as of Next 16; keep it disabled
  // because Turbopack doesn't support it yet.
  typedRoutes: false,
};

// Sentry build-time wrapper. No-ops if SENTRY_DSN / SENTRY_AUTH_TOKEN aren't
// set; produces source maps & a release entry when they are.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: process.env.SENTRY_TUNNEL_ROUTE,
  widenClientFileUpload: false,
});
