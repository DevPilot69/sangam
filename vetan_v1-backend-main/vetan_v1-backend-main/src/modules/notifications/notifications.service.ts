import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, tenantId: string, limit = 30) {
    const rows = await this.prisma.notification.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
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

  async markRead(userId: string, tenantId: string, id: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId, tenantId },
    });
    if (!row) throw new NotFoundException('Notification not found');
    const updated = await this.prisma.notification.update({
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
}
