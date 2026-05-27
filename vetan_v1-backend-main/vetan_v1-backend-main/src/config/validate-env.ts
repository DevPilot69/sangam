import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url(),
  /** Comma-separated extra allowed origins (e.g. alternate Vercel domains) */
  CORS_EXTRA_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  AWS_S3_BUCKET: z.string().min(1),
  SENDGRID_API_KEY: z.string().min(1),
  /** Razorpay — use dashboard keys; placeholders enable mock billing in dev */
  RAZORPAY_KEY_ID: z.string().min(1).default('rzp_test_placeholder'),
  RAZORPAY_KEY_SECRET: z.string().min(1).default('placeholder'),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  /** Plan IDs from Razorpay Dashboard → Subscriptions → Plans */
  RAZORPAY_PLAN_STARTER: z.string().optional(),
  RAZORPAY_PLAN_GROWTH: z.string().optional(),
  BILLING_TRIAL_DAYS: z.coerce.number().int().positive().default(14),
  /** If true, OTP is logged to console and login skips email verification (local only). */
  DEV_AUTH_VERBOSE: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  /** Artificial delay (ms) on API responses for demo UX testing */
  DEMO_LATENCY_MS: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 0)),
  /** Appended to company code for default employee / reset passwords (e.g. BR + Vetan → BRVetan) */
  EMPLOYEE_DEFAULT_PASSWORD_KEYWORD: z.string().min(2).max(32).default('Vetan'),
  /** Local directory for tenant legal document uploads (relative to process cwd if not absolute) */
  LEGAL_DOCUMENTS_DIR: z.string().default('uploads/tenant-legal-docs'),
  /** Per-employee onboarding / KYC files (HR upload; employees read-only in portal) */
  EMPLOYEE_DOCUMENTS_DIR: z.string().default('uploads/employee-docs'),
});

export type EnvVars = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg)}`);
  }
  return parsed.data;
}
