import type { NextConfig } from "next";

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
  experimental: {
    // Optional: silences workspace package import warnings.
    typedRoutes: false,
  },
};

export default nextConfig;
