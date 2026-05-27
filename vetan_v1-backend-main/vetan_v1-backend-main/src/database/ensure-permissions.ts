import type { PrismaClient } from '@prisma/client';
import { PERMISSION_CODES } from '../shared/authz/permission-codes';

/** Idempotent — safe on every deploy boot and before tenant registration. */
export async function ensurePermissions(
  prisma: PrismaClient,
): Promise<{ id: string; code: string }[]> {
  for (const code of PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, description: code },
      update: {},
    });
  }
  return prisma.permission.findMany({
    select: { id: true, code: true },
  });
}
