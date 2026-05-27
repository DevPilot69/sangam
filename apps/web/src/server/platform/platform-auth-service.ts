import bcrypt from "bcryptjs";
import { prisma } from "@sangam/db";
import { UnauthorizedError } from "@sangam/api-kit";
import { signAccess } from "@/server/auth/token-service";

/**
 * Platform-auth service — ported from
 * src/modules/platform/platform-auth.service.ts (NestJS).
 *
 * Issues a `scope: "platform"` access token. Unlike tenant logins, this
 * does not issue a refresh cookie — platform admin sessions are short-
 * lived and renewed by re-login.
 *
 * `bcrypt` swapped for `bcryptjs` to stay Vercel/edge-safe (no native
 * binaries). Hash format is identical so seeded rows still compare.
 */

export async function login(email: string, password: string) {
  const admin = await prisma.platformAdmin.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!admin || admin.status !== "ACTIVE") {
    throw new UnauthorizedError("Invalid credentials");
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) throw new UnauthorizedError("Invalid credentials");

  await prisma.platformAdmin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = await signAccess({
    sub: admin.id,
    email: admin.email,
    scope: "platform",
    tenantId: "",
    roles: ["PLATFORM_ADMIN"],
    permissions: ["platform:*"],
  });

  return {
    accessToken,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: "platform_admin",
    },
  };
}

export async function me(adminId: string) {
  const admin = await prisma.platformAdmin.findUnique({
    where: { id: adminId },
  });
  if (!admin) throw new UnauthorizedError("Not found");
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: "platform_admin",
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
  };
}
