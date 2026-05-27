import { withApi } from "@sangam/api-kit";
import { prisma } from "@sangam/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check — confirms:
 *   - the Next.js server is serving Route Handlers under `/v1`
 *   - Prisma can reach Neon (single SELECT 1)
 *   - api-kit's withApi envelope is wired
 */
export const GET = withApi(async () => {
  let db: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "error";
  }
  return {
    ok: true,
    db,
    env: process.env.NODE_ENV ?? "unknown",
    demo: (process.env.DEMO_MODE ?? "true").toLowerCase() !== "false",
    timestamp: new Date().toISOString(),
  };
});
