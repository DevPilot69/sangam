import { prisma } from "@sangam/db";
import { NotFoundError } from "@sangam/api-kit";

/**
 * Notifications service — ported from
 * src/modules/notifications/notifications.service.ts (NestJS).
 *
 * Two responsibilities:
 *  - `list(userId, tenantId, limit)` returns the most-recent N notifications
 *    scoped to the caller. The 100-item cap is preserved.
 *  - `markRead(userId, tenantId, id)` flips `readAt` on a notification the
 *    caller owns; throws 404 otherwise so cross-tenant probing returns the
 *    same status as a missing row.
 */
export async function list(
  userId: string,
  tenantId: string,
  limit = 30,
) {
  const rows = await prisma.notification.findMany({
    where: { userId, tenantId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    readAt: r.readAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function markRead(
  userId: string,
  tenantId: string,
  id: string,
) {
  const row = await prisma.notification.findFirst({
    where: { id, userId, tenantId },
  });
  if (!row) throw new NotFoundError("Notification not found");
  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    readAt: updated.readAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  };
}
