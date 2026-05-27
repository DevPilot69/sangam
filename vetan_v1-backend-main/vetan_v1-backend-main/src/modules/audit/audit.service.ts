import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    opts?: { limit?: number; entityType?: string },
  ) {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(opts?.entityType && { entityType: opts.entityType }),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(opts?.limit ?? 100, 500),
    });
    const userIds = [
      ...new Set(rows.map((r) => r.userId).filter(Boolean) as string[]),
    ];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
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
      userName: r.userId ? nameById.get(r.userId) ?? null : null,
      diff: r.diff as Record<string, unknown> | null,
      ip: r.ip,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
