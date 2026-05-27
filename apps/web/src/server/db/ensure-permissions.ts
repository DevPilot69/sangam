import { prisma, type PrismaClient } from "@sangam/db";
import { PERMISSION_CODES } from "@sangam/contracts";

/**
 * Idempotently upserts the canonical PERMISSION_CODES into the Permission
 * table. Ported from src/database/ensure-permissions.ts.
 *
 * Safe to call on every API cold start or before tenant provisioning.
 */
export async function ensurePermissions(
  client: PrismaClient = prisma,
): Promise<{ id: string; code: string }[]> {
  for (const code of PERMISSION_CODES) {
    await client.permission.upsert({
      where: { code },
      create: { code, description: code },
      update: {},
    });
  }
  return client.permission.findMany({
    select: { id: true, code: true },
  });
}
