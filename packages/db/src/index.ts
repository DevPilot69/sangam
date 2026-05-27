import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton.
 *
 * Pattern explained:
 *  - In Next.js dev mode (HMR), modules are reloaded on every change. Without
 *    this guard each reload would instantiate a new PrismaClient, leak the
 *    previous connection, and quickly exhaust Neon's pool.
 *  - On Vercel each Lambda invocation may share the singleton across requests
 *    *within the same container*, but cold starts always create a fresh one.
 *    Pair this with a *pooled* DATABASE_URL (Neon's PgBouncer endpoint) and
 *    `connection_limit=1` so each Lambda holds at most one upstream socket.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-export everything from the generated client so consumers can write
// `import { Prisma, PayrollRunStatus } from "@sangam/db"` instead of pulling
// directly from `@prisma/client`.
export * from "@prisma/client";
