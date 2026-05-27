import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'crypto';
import type { EnvVars } from '../../config/validate-env';
import { ensurePermissions } from '../../database/ensure-permissions';
import { PrismaService } from '../../database/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { BillingService } from '../billing/billing.service';
import { TokenService } from './token.service';

const LOCK_MINUTES = 30;
const MAX_FAILED = 5;
const BCRYPT_ROUNDS = 12;

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return s.length > 0 ? s : 'workspace';
}

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function permissionCodesFromUser(user: {
  roles: { role: { permissions: { permission: { code: string } }[] } }[];
}): string[] {
  const set = new Set<string>();
  for (const ur of user.roles) {
    for (const rp of ur.role.permissions) {
      set.add(rp.permission.code);
    }
  }
  return [...set];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService<EnvVars, true>,
    private readonly billing: BillingService,
  ) {}

  async register(dto: RegisterDto) {
    let slug = slugify(dto.companyName);
    const exists = await this.prisma.tenant.findUnique({ where: { slug } });
    if (exists) {
      slug = `${slug}-${randomInt(1, 9999)}`;
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = hashOtp(code);
    const verbose = this.config.get('DEV_AUTH_VERBOSE', { infer: true });
    const emailNorm = dto.email.toLowerCase().trim();

    const permissions = await ensurePermissions(this.prisma);

    const existingUser = await this.prisma.user.findFirst({
      where: { email: emailNorm },
    });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        slug,
        name: dto.companyName,
      },
    });

    await this.billing.ensureTrialSubscription(tenant.id);

    const role = await this.prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'ADMIN',
        description: 'Full workspace administrator',
        permissions: {
          create: permissions.map((p) => ({
            permissionId: p.id,
          })),
        },
      },
    });

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: emailNorm,
        name: dto.name,
        passwordHash,
        roles: {
          create: [{ roleId: role.id }],
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        tenantId: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.emailVerificationOtp.create({
      data: {
        email: user.email,
        tenantId: tenant.id,
        codeHash,
        expiresAt,
      },
    });

    if (verbose) {
      this.logger.warn(
        `DEV email OTP for ${user.email} @ ${tenant.slug}: ${code}`,
      );
    }

    return {
      user: { ...user, tenantSlug: tenant.slug },
      message:
        'Check your email for the verification code (see server logs in DEV_AUTH_VERBOSE mode).',
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (!tenant) throw new BadRequestException('Unknown workspace');

    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, email: dto.email.toLowerCase() },
    });
    if (!user) throw new BadRequestException('User not found');

    const row = await this.prisma.emailVerificationOtp.findFirst({
      where: {
        email: user.email,
        tenantId: tenant.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!row || row.codeHash !== hashOtp(dto.code)) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationOtp.deleteMany({
        where: { email: user.email, tenantId: tenant.id },
      }),
    ]);

    return { ok: true };
  }

  async login(
    dto: LoginDto,
    opts?: {
      setCookie?: (name: string, val: string, maxAgeMs: number) => void;
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (!tenant) throw new UnauthorizedException('Invalid credentials');

    const loginNorm = dto.login.trim();
    const loginLower = loginNorm.toLowerCase();
    const loginUpper = loginNorm.toUpperCase();

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        OR: [
          { email: loginLower },
          { loginUsername: loginUpper },
          { loginUsername: loginNorm },
        ],
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked');
    }

    const verbose = this.config.get('DEV_AUTH_VERBOSE', { infer: true });
    if (!user.emailVerifiedAt && !verbose) {
      throw new UnauthorizedException('Email not verified');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      const failed = user.failedLoginCount + 1;
      const lockedUntil =
        failed >= MAX_FAILED
          ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
          : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failed >= MAX_FAILED ? 0 : failed,
          lockedUntil,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = permissionCodesFromUser(user);
    const linkedEmployee = await this.prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    });
    const accessToken = this.tokens.signAccess({
      sub: user.id,
      scope: 'tenant',
      tenantId: user.tenantId,
      email: user.email,
      employeeId: linkedEmployee?.id,
      roles,
      permissions,
    });
    const refreshRaw = await this.tokens.issueRefreshToken(user.id);
    const refreshMs = this.tokens.refreshMs();
    opts?.setCookie?.('vetan_refresh', refreshRaw, refreshMs);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        phoneAlt: user.phoneAlt,
        aadhar: user.aadhar,
        pan: user.pan,
        tenantId: user.tenantId,
        tenantSlug: tenant.slug,
        companyName: tenant.name,
        roles,
        permissions,
        onboardingComplete: !!tenant.onboardingCompletedAt,
        emailVerifiedAt: user.emailVerifiedAt,
        employeeId: linkedEmployee?.id ?? null,
      },
    };
  }

  async refresh(
    refreshToken: string | undefined,
    opts?: {
      setCookie?: (name: string, val: string, maxAgeMs: number) => void;
    },
  ) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const session = await this.tokens.validateRefreshToken(refreshToken);
    if (!session) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.prisma.user.findFirst({
      where: { id: session.userId, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });
    if (!tenant) throw new UnauthorizedException('Tenant not found');

    const newRefresh = await this.tokens.rotateRefreshToken(
      refreshToken,
      user.id,
    );
    const refreshMs = this.tokens.refreshMs();
    opts?.setCookie?.('vetan_refresh', newRefresh, refreshMs);

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = permissionCodesFromUser(user);
    const linkedEmployee = await this.prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    });
    const accessToken = this.tokens.signAccess({
      sub: user.id,
      scope: 'tenant',
      tenantId: user.tenantId,
      email: user.email,
      employeeId: linkedEmployee?.id,
      roles,
      permissions,
    });
    return { accessToken };
  }

  async logout(refreshToken: string | undefined) {
    if (refreshToken) await this.tokens.revokeRefreshToken(refreshToken);
    return { ok: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (!tenant) return { ok: true };

    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, email: dto.email.toLowerCase() },
    });
    if (!user) return { ok: true };

    const raw = randomBytes(32).toString('hex');
    const tokenHash = this.tokens.hashRefresh(raw);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.passwordResetToken.create({
      data: { email: user.email, tokenHash, expiresAt },
    });
    this.logger.warn(
      `Password reset token for ${user.email}: ${raw} (dev only — wire email queue in production)`,
    );
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hash = this.tokens.hashRefresh(dto.token);
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hash },
    });
    if (!row || row.expiresAt < new Date())
      throw new BadRequestException('Invalid or expired token');

    const user = await this.prisma.user.findFirst({
      where: { email: row.email },
    });
    if (!user) throw new BadRequestException('User not found');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.delete({ where: { id: row.id } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });
    const permissions = permissionCodesFromUser(user);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      phoneAlt: user.phoneAlt,
      aadhar: user.aadhar,
      pan: user.pan,
      tenantId: user.tenantId,
      tenantSlug: tenant?.slug,
      companyName: tenant?.name,
      roles: user.roles.map((r) => r.role.name),
      permissions,
      onboardingComplete: !!tenant?.onboardingCompletedAt,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException();

    const hasAny =
      dto.name !== undefined ||
      dto.email !== undefined ||
      dto.phone !== undefined ||
      dto.phoneAlt !== undefined ||
      dto.aadhar !== undefined ||
      dto.pan !== undefined;
    if (!hasAny) {
      throw new BadRequestException('No profile fields to update');
    }
    if (dto.email !== undefined) {
      const emailNorm = dto.email.toLowerCase();
      const clash = await this.prisma.user.findFirst({
        where: {
          tenantId: user.tenantId,
          email: emailNorm,
          NOT: { id: userId },
          deletedAt: null,
        },
      });
      if (clash) throw new ConflictException('Email already in use');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email.toLowerCase() }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
        ...(dto.phoneAlt !== undefined && { phoneAlt: dto.phoneAlt || null }),
        ...(dto.aadhar !== undefined && { aadhar: dto.aadhar || null }),
        ...(dto.pan !== undefined && { pan: dto.pan || null }),
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: updated.tenantId },
    });
    const permissions = permissionCodesFromUser(updated);
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      phoneAlt: updated.phoneAlt,
      aadhar: updated.aadhar,
      pan: updated.pan,
      tenantId: updated.tenantId,
      tenantSlug: tenant?.slug,
      companyName: tenant?.name,
      roles: updated.roles.map((r) => r.role.name),
      permissions,
      onboardingComplete: !!tenant?.onboardingCompletedAt,
      emailVerifiedAt: updated.emailVerifiedAt,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException();

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);
    return { ok: true as const };
  }
}
