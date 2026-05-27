import { prisma } from "@sangam/db";

/**
 * Audit log service — ported from src/modules/audit/audit.service.ts
 * (NestJS).
 *
 * Returns the most-recent audit log entries for a tenant, optionally
 * filtered by entityType. The 500-row hard cap is preserved.
 *
 * User name resolution is done in a single follow-up query (`findMany IN`)
 * rather than per-row to keep the response O(1) DB calls.
 */
export async function list(
  tenantId: string,
  opts?: { limit?: number; entityType?: string },
) {
  const rows = await prisma.auditLog.findMany({
    where: {
      tenantId,
      ...(opts?.entityType && { entityType: opts.entityType }),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts?.limit ?? 100, 500),
  });
  const userIds = [
    ...new Set(rows.map((r) => r.userId).filter(Boolean) as string[]),
  ];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    userId: r.userId,
    userName: r.userId ? (nameById.get(r.userId) ?? null) : null,
    diff: r.diff as Record<string, unknown> | null,
    ip: r.ip,
    createdAt: r.createdAt.toISOString(),
  }));
}
