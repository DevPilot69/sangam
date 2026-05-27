import { z } from "zod";

/**
 * Zod ports of the original NestJS auth DTOs. The error message strings are
 * deliberately preserved verbatim — the frontend uses them to populate inline
 * form errors and toast banners, and changing them is a silent regression.
 *
 * Mapping rules used (so we can apply them consistently across all modules):
 *   - @IsString()             -> z.string()  (Zod emits "Expected string, received...")
 *   - @MinLength(n)           -> z.string().min(n)
 *   - @MaxLength(n)           -> z.string().max(n)
 *   - @Length(min, max)       -> z.string().min(min).max(max)
 *   - @Matches(re, {message}) -> z.string().regex(re, { message })
 *   - @Matches(re)            -> z.string().regex(re)
 *   - @IsEmail()              -> z.string().email()
 *   - @IsOptional()           -> .optional()
 *   - @IsEnum(E)              -> z.nativeEnum(E)
 *   - @IsUUID()               -> z.string().uuid()
 *   - @IsInt() @Min @Max      -> z.coerce.number().int().min().max()
 *
 * For required-but-typed (`!`) fields we DO NOT mark `.optional()`. For
 * `transform`-style decorators (e.g. `@Type(() => Number)`) we use `z.coerce.*`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared atoms

const tenantSlug = z
  .string()
  .min(2)
  .regex(/^[a-z0-9-]+$/);

const passwordPolicy = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "password must contain an uppercase letter")
  .regex(/[0-9]/, "password must contain a number")
  .regex(/[^A-Za-z0-9]/, "password must contain a special character");

// ─────────────────────────────────────────────────────────────────────────────
// /v1/auth/register

export const RegisterSchema = z.object({
  name: z.string().min(2).max(120),
  companyName: z.string().min(2).max(120),
  email: z.string().email(),
  password: passwordPolicy,
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// /v1/auth/login

export const LoginSchema = z.object({
  tenantSlug,
  login: z.string().min(2).max(120),
  password: z.string().min(8),
});
export type LoginDto = z.infer<typeof LoginSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// /v1/auth/verify-email

export const VerifyEmailSchema = z.object({
  tenantSlug,
  email: z.string().email(),
  code: z
    .string()
    .min(6)
    .max(6)
    .regex(/^\d{6}$/),
});
export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// /v1/auth/forgot-password

export const ForgotPasswordSchema = z.object({
  tenantSlug,
  email: z.string().email(),
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// /v1/auth/reset-password

export const ResetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordPolicy,
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// /v1/auth/change-password

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /v1/auth/profile

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().max(32).optional(),
  phoneAlt: z.string().max(32).optional(),
  aadhar: z.string().max(20).optional(),
  pan: z.string().max(20).optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
