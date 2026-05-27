import { SignJWT } from "jose";
import type { AccessTokenPayload } from "./require-auth";

/**
 * Signs an access JWT with the same shape NestJS's `@nestjs/jwt` produced.
 *
 * NestJS configured `JwtModule.register({ secret, signOptions: { expiresIn } })`
 * which under the hood calls `jsonwebtoken.sign(payload, secret, { expiresIn })`.
 * `jose.SignJWT` with HS256 + the same JWT_SECRET produces a byte-identical
 * token shape (header { alg: "HS256", typ: "JWT" } + claims).
 */

const encoder = new TextEncoder();

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or shorter than 32 chars — cannot sign tokens",
    );
  }
  return encoder.encode(s);
}

/** Parses durations like "15m", "7d", "3600", "12h". Falls back to 15 minutes. */
function parseDurationSeconds(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const t = input.trim();
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(\d+)([smhd])$/i.exec(t);
  if (!m) return fallback;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  if (u === "s") return n;
  if (u === "m") return n * 60;
  if (u === "h") return n * 3600;
  return n * 86400;
}

export async function signAccessToken(
  payload: Omit<AccessTokenPayload, "iat" | "exp">,
  opts: { expiresIn?: string } = {},
): Promise<string> {
  const expSeconds = parseDurationSeconds(
    opts.expiresIn ?? process.env.JWT_ACCESS_EXPIRES,
    15 * 60,
  );
  return new SignJWT({ ...payload } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${expSeconds}s`)
    .sign(secret());
}
