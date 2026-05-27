/**
 * Token service — refresh-token issuance, rotation, revocation, validation.
 *
 * Ported from src/modules/auth/token.service.ts. Differences:
 *   - No @Injectable / DI. Stateless module-level functions.
 *   - JWT signing delegated to @sangam/api-kit's signAccessToken (jose-based,
 *     produces the same HS256 + same claims as the original `@nestjs/jwt`).
 *   - All other behaviour byte-identical (sha256 hashing, randomBytes 48 ->
 *     base64url, single-use rotation, cascade-revoke on logout).
 */

import { createHash, randomBytes } from "crypto";
import { prisma } from "@sangam/db";
import { signAccessToken, type AccessTokenPayload } from "@sangam/api-kit";

export type { AccessTokenPayload } from "@sangam/api-kit";

export function hashRefresh(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function signAccess(
  payload: Omit<AccessTokenPayload, "iat" | "exp">,
): Promise<string> {
  return signAccessToken(payload);
}

export function refreshMs(): number {
  return parseDurationMs(process.env.JWT_REFRESH_EXPIRES ?? "7d");
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = randomBytes(48).toString("base64url");
  const tokenHash = hashRefresh(raw);
  const expiresAt = new Date(Date.now() + refreshMs());
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  return raw;
}

export async function rotateRefreshToken(
  raw: string,
  userId: string,
): Promise<string> {
  const tokenHash = hashRefresh(raw);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });
  if (
    !existing ||
    existing.userId !== userId ||
    existing.expiresAt < new Date()
  ) {
    throw new Error("INVALID_REFRESH");
  }
  await prisma.refreshToken.delete({ where: { id: existing.id } });
  return issueRefreshToken(userId);
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  const tokenHash = hashRefresh(raw);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export async function validateRefreshToken(
  raw: string,
): Promise<{ userId: string } | null> {
  const tokenHash = hashRefresh(raw);
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!row || row.expiresAt < new Date()) return null;
  return { userId: row.userId };
}

function parseDurationMs(input: string): number {
  const m = /^(\d+)([smhd])$/i.exec(input.trim());
  if (!m) return 7 * 86400000;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  if (u === "s") return n * 1000;
  if (u === "m") return n * 60000;
  if (u === "h") return n * 3600000;
  return n * 86400000;
}
