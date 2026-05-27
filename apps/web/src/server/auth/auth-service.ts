/**
 * Auth service — ported from src/modules/auth/auth.service.ts (NestJS).
 *
 * Differences from the original:
 *   - No @Injectable / constructor injection. All deps imported as singletons.
 *   - Errors thrown using @sangam/api-kit's typed ApiError subclasses; their
 *     status codes + JSON shape match NestJS's HttpException 1:1.
 *   - bcrypt replaced with bcryptjs (pure JS, Vercel-safe). Hash format is the
 *     same so existing rows remain comparable.
 *   - Email side-effects (verify OTP, password reset) routed through the
 *     @sangam/demo email provider. In DEMO_MODE the OTP / reset token is
 *     inserted into MockEmail; the inbox UI shows it.
 *   - signAccess() now returns a Promise (jose is async).
 *
 * Behaviour preserved verbatim:
 *   - account lockout (5 failures => 30min lock)
 *   - email verification gate (DEV_AUTH_VERBOSE bypasses)
 *   - tenant slug generator + collision suffix
 *   - all field names in returned `user` payload (frontend reads these)
 */
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt } from "crypto";
import {
  prisma,
  type Prisma,
} from "@sangam/db";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from "@sangam/api-kit";
import type {
  Auth,
} from "@sangam/contracts";
import { email as emailProvider } from "@sangam/demo";
import { ensurePermissions } from "../db/ensure-permissions";
import { ensureTrialSubscription } from "../billing/trial";
import {
  hashRefresh,
  issueRefreshToken,
  refreshMs,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccess,
  validateRefreshToken,
} from "./token-service";

const LOCK_MINUTES = 30;
const MAX_FAILED = 5;
const BCRYPT_ROUNDS = 12;

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return s.length > 0 ? s : "workspace";
}

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
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

function devVerbose(): boolean {
  return process.env.DEV_AUTH_VERBOSE === "true" || process.env.DEV_AUTH_VERBOSE === "1";
}

// ───────────────────────────────────────────────────────────────────────────
// register

export async function register(dto: Auth.RegisterDto) {
  let slug = slugify(dto.companyName);
  const exists = await prisma.tenant.findUnique({ where: { slug } });
  if (exists) {
    slug = `${slug}-${randomInt(1, 9999)}`;
  }

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = hashOtp(code);
  const emailNorm = dto.email.toLowerCase().trim();

  const permissions = await ensurePermissions();

  const existingUser = await prisma.user.findFirst({
    where: { email: emailNorm },
  });
  if (existingUser) {
    throw new ConflictError("An account with this email already exists");
  }

  const tenant = await prisma.tenant.create({
    data: { slug, name: dto.companyName },
  });

  await ensureTrialSubscription(tenant.id);

  const role = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: "ADMIN",
      description: "Full workspace administrator",
      permissions: {
        create: permissions.map((p) => ({ permissionId: p.id })),
      },
    },
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: emailNorm,
      name: dto.name,
      passwordHash,
      roles: { create: [{ roleId: role.id }] },
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
  await prisma.emailVerificationOtp.create({
    data: { email: user.email, tenantId: tenant.id, codeHash, expiresAt },
  });

  // Deliver OTP (mock email provider in demo mode -> MockEmail table).
  await emailProvider.send({
    to: user.email,
    tenantId: tenant.id,
    subject: `Your Sangam verification code: ${code}`,
    body: `Hi ${user.name},\n\nYour 6-digit verification code is ${code}. It expires in 10 minutes.\n\n— Sangam`,
    category: "verify-email",
    metadata: { code, tenantSlug: tenant.slug },
  });

  if (devVerbose()) {
    console.warn(
      `[auth] DEV email OTP for ${user.email} @ ${tenant.slug}: ${code}`,
    );
  }

  return {
    user: { ...user, tenantSlug: tenant.slug },
    message:
      "Check your email for the verification code (see server logs in DEV_AUTH_VERBOSE mode).",
  };
}

// ───────────────────────────────────────────────────────────────────────────
// verifyEmail

export async function verifyEmail(dto: Auth.VerifyEmailDto) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: dto.tenantSlug },
  });
  if (!tenant) throw new BadRequestError("Unknown workspace");

  const user = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: dto.email.toLowerCase() },
  });
  if (!user) throw new BadRequestError("User not found");

  const row = await prisma.emailVerificationOtp.findFirst({
    where: {
      email: user.email,
      tenantId: tenant.id,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.codeHash !== hashOtp(dto.code)) {
    throw new UnauthorizedError("Invalid or expired code");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationOtp.deleteMany({
      where: { email: user.email, tenantId: tenant.id },
    }),
  ]);

  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────────────
// login

const userInclude = {
  roles: {
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type LoginCookieSetter = (
  name: string,
  val: string,
  maxAgeMs: number,
) => void;

export async function login(
  dto: Auth.LoginDto,
  opts?: { setCookie?: LoginCookieSetter },
) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: dto.tenantSlug },
  });
  if (!tenant) throw new UnauthorizedError("Invalid credentials");

  const loginNorm = dto.login.trim();
  const loginLower = loginNorm.toLowerCase();
  const loginUpper = loginNorm.toUpperCase();

  const user = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      deletedAt: null,
      OR: [
        { email: loginLower },
        { loginUsername: loginUpper },
        { loginUsername: loginNorm },
      ],
    },
    include: userInclude,
  });
  if (!user) throw new UnauthorizedError("Invalid credentials");

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new UnauthorizedError("Account temporarily locked");
  }

  if (!user.emailVerifiedAt && !devVerbose()) {
    throw new UnauthorizedError("Email not verified");
  }

  const ok = await bcrypt.compare(dto.password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLoginCount + 1;
    const lockedUntil =
      failed >= MAX_FAILED
        ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
        : null;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failed >= MAX_FAILED ? 0 : failed,
        lockedUntil,
      },
    });
    throw new UnauthorizedError("Invalid credentials");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = permissionCodesFromUser(user);
  const linkedEmployee = await prisma.employee.findFirst({
    where: { userId: user.id, tenantId: user.tenantId, deletedAt: null },
    select: { id: true },
  });

  const accessToken = await signAccess({
    sub: user.id,
    scope: "tenant",
    tenantId: user.tenantId,
    email: user.email,
    employeeId: linkedEmployee?.id,
    roles,
    permissions,
  });

  const refreshRaw = await issueRefreshToken(user.id);
  opts?.setCookie?.("vetan_refresh", refreshRaw, refreshMs());

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

// ───────────────────────────────────────────────────────────────────────────
// refresh

export async function refresh(
  refreshToken: string | undefined,
  opts?: { setCookie?: LoginCookieSetter },
) {
  if (!refreshToken) throw new UnauthorizedError("Missing refresh token");
  const session = await validateRefreshToken(refreshToken);
  if (!session) throw new UnauthorizedError("Invalid refresh token");

  const user = await prisma.user.findFirst({
    where: { id: session.userId, deletedAt: null },
    include: userInclude,
  });
  if (!user) throw new UnauthorizedError("User not found");

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
  });
  if (!tenant) throw new UnauthorizedError("Tenant not found");

  const newRefresh = await rotateRefreshToken(refreshToken, user.id);
  opts?.setCookie?.("vetan_refresh", newRefresh, refreshMs());

  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = permissionCodesFromUser(user);
  const linkedEmployee = await prisma.employee.findFirst({
    where: { userId: user.id, tenantId: user.tenantId, deletedAt: null },
    select: { id: true },
  });

  const accessToken = await signAccess({
    sub: user.id,
    scope: "tenant",
    tenantId: user.tenantId,
    email: user.email,
    employeeId: linkedEmployee?.id,
    roles,
    permissions,
  });
  return { accessToken };
}

// ───────────────────────────────────────────────────────────────────────────
// logout

export async function logout(refreshToken: string | undefined) {
  if (refreshToken) await revokeRefreshToken(refreshToken);
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────────────
// forgotPassword

export async function forgotPassword(dto: Auth.ForgotPasswordDto) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: dto.tenantSlug },
  });
  if (!tenant) return { ok: true };

  const user = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: dto.email.toLowerCase() },
  });
  if (!user) return { ok: true };

  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashRefresh(raw);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: { email: user.email, tokenHash, expiresAt },
  });

  await emailProvider.send({
    to: user.email,
    tenantId: tenant.id,
    subject: "Sangam — password reset",
    body:
      `Use this token to reset your password (expires in 1 hour):\n\n${raw}\n\n` +
      `If you didn't request this, ignore this email.`,
    category: "reset-password",
    metadata: { token: raw, tenantSlug: tenant.slug },
  });

  if (devVerbose()) {
    console.warn(`[auth] Password reset token for ${user.email}: ${raw}`);
  }
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────────────
// resetPassword

export async function resetPassword(dto: Auth.ResetPasswordDto) {
  const tokenHash = hashRefresh(dto.token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!row || row.expiresAt < new Date()) {
    throw new BadRequestError("Invalid or expired token");
  }

  const user = await prisma.user.findFirst({ where: { email: row.email } });
  if (!user) throw new BadRequestError("User not found");

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.delete({ where: { id: row.id } }),
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
  ]);
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────────────
// me

export async function me(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: userInclude,
  });
  if (!user) throw new UnauthorizedError();
  const tenant = await prisma.tenant.findUnique({
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

// ───────────────────────────────────────────────────────────────────────────
// updateProfile

export async function updateProfile(
  userId: string,
  dto: Auth.UpdateProfileDto,
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) throw new UnauthorizedError();

  const hasAny =
    dto.name !== undefined ||
    dto.email !== undefined ||
    dto.phone !== undefined ||
    dto.phoneAlt !== undefined ||
    dto.aadhar !== undefined ||
    dto.pan !== undefined;
  if (!hasAny) {
    throw new BadRequestError("No profile fields to update");
  }
  if (dto.email !== undefined) {
    const emailNorm = dto.email.toLowerCase();
    const clash = await prisma.user.findFirst({
      where: {
        tenantId: user.tenantId,
        email: emailNorm,
        NOT: { id: userId },
        deletedAt: null,
      },
    });
    if (clash) throw new ConflictError("Email already in use");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email.toLowerCase() }),
      ...(dto.phone !== undefined && { phone: dto.phone || null }),
      ...(dto.phoneAlt !== undefined && { phoneAlt: dto.phoneAlt || null }),
      ...(dto.aadhar !== undefined && { aadhar: dto.aadhar || null }),
      ...(dto.pan !== undefined && { pan: dto.pan || null }),
    },
    include: userInclude,
  });

  const tenant = await prisma.tenant.findUnique({
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

// ───────────────────────────────────────────────────────────────────────────
// changePassword

export async function changePassword(
  userId: string,
  dto: Auth.ChangePasswordDto,
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) throw new UnauthorizedError();

  const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
  if (!ok) throw new UnauthorizedError("Current password is incorrect");

  const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ]);
  return { ok: true as const };
}

// Re-export so route handlers don't need a second import.
export { revokeAllRefreshTokens };
