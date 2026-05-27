import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import type { EnvVars } from '../../config/validate-env';
import { PrismaService } from '../../database/prisma.service';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  scope: 'tenant' | 'platform';
  /** Empty string for platform-scoped tokens */
  tenantId: string;
  employeeId?: string;
  roles: string[];
  permissions: string[];
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvVars, true>,
    private readonly prisma: PrismaService,
  ) {}

  signAccess(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload);
  }

  hashRefresh(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /** Returns the raw refresh token (send to client cookie only). */
  async issueRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(48).toString('base64url');
    const tokenHash = this.hashRefresh(raw);
    const expires = this.refreshExpiryDate();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: expires,
      },
    });
    return raw;
  }

  async rotateRefreshToken(raw: string, userId: string): Promise<string> {
    const hash = this.hashRefresh(raw);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
    });
    if (
      !existing ||
      existing.userId !== userId ||
      existing.expiresAt < new Date()
    ) {
      throw new Error('INVALID_REFRESH');
    }
    await this.prisma.refreshToken.delete({ where: { id: existing.id } });
    return this.issueRefreshToken(userId);
  }

  async revokeRefreshToken(raw: string): Promise<void> {
    const hash = this.hashRefresh(raw);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: hash } });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async validateRefreshToken(raw: string): Promise<{ userId: string } | null> {
    const hash = this.hashRefresh(raw);
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
    });
    if (!row || row.expiresAt < new Date()) return null;
    return { userId: row.userId };
  }

  refreshMs(): number {
    const s = this.config.get('JWT_REFRESH_EXPIRES', { infer: true });
    return parseDurationMs(s);
  }

  private refreshExpiryDate(): Date {
    return new Date(Date.now() + this.refreshMs());
  }
}

function parseDurationMs(input: string): number {
  const m = /^(\d+)([smhd])$/i.exec(input.trim());
  if (!m) return 7 * 86400000;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  if (u === 's') return n * 1000;
  if (u === 'm') return n * 60000;
  if (u === 'h') return n * 3600000;
  return n * 86400000;
}
