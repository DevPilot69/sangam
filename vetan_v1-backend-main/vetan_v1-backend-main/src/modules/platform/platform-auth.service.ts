import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { TokenService } from '../auth/token.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!admin || admin.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.tokens.signAccess({
      sub: admin.id,
      email: admin.email,
      scope: 'platform',
      tenantId: '',
      roles: ['PLATFORM_ADMIN'],
      permissions: ['platform:*'],
    });

    return {
      accessToken,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'platform_admin',
      },
    };
  }

  async me(adminId: string) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new UnauthorizedException('Not found');
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'platform_admin',
      lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    };
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }
}
