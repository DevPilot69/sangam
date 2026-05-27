import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// platform-auth

export const PlatformLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type PlatformLoginDto = z.infer<typeof PlatformLoginSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// platform-tenants

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const companyCodePattern = /^[A-Za-z0-9]+$/;

export const SlugCheckQuerySchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(slugPattern, {
      message: "slug must be lowercase letters, numbers, and hyphens",
    }),
});
export type SlugCheckQueryDto = z.infer<typeof SlugCheckQuerySchema>;

const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
] as const;

const TENANT_PAYMENT_STATUSES = [
  "PAID",
  "UNPAID",
  "OVERDUE",
  "WAIVED",
] as const;

export const ProvisionTenantSchema = z.object({
  name: z.string().min(2).max(120),
  legalName: z.string().max(255).optional(),
  companyCode: z
    .string()
    .min(2)
    .max(8)
    .regex(companyCodePattern, {
      message: "companyCode must be letters or numbers only",
    })
    .optional(),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(slugPattern, {
      message: "slug must be lowercase letters, numbers, and hyphens",
    })
    .optional(),
  industry: z.string().max(100).optional(),
  country: z.string().max(2).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  planCode: z.string().max(50).optional(),
  subscriptionStatus: z.enum(SUBSCRIPTION_STATUSES).optional(),
  trialDays: z.coerce.number().int().min(0).max(365).optional(),
  monthlyFeeInr: z.coerce.number().min(0).optional(),
  monthlyServerCostInr: z.coerce.number().min(0).optional(),
  paymentStatus: z.enum(TENANT_PAYMENT_STATUSES).optional(),
  billingNotes: z.string().max(500).optional(),
  adminName: z.string().min(2).max(120),
  adminEmail: z.string().email(),
  adminPassword: z
    .string()
    .min(8)
    .refine((s) => /[A-Z]/.test(s), {
      message: "adminPassword must contain an uppercase letter",
    })
    .refine((s) => /[0-9]/.test(s), {
      message: "adminPassword must contain a number",
    })
    .refine((s) => /[^A-Za-z0-9]/.test(s), {
      message: "adminPassword must contain a special character",
    }),
  verifyAdminEmail: z.boolean().optional(),
  departmentName: z.string().min(2).max(120).optional(),
  departmentCode: z.string().min(2).max(24).optional(),
  designationTitle: z.string().min(2).max(120).optional(),
  markOnboardingComplete: z.boolean().optional(),
});
export type ProvisionTenantDto = z.infer<typeof ProvisionTenantSchema>;

export const UpdateCompanyCodeSchema = z.object({
  companyCode: z.string().min(2).max(8).regex(companyCodePattern),
});
export type UpdateCompanyCodeDto = z.infer<typeof UpdateCompanyCodeSchema>;

const OPERATIONAL_STATUSES = [
  "LIVE",
  "TRIAL",
  "SETUP",
  "PAST_DUE",
  "CHURNED",
] as const;

export const UpdateTenantOperationalStatusSchema = z.object({
  operationalStatus: z.enum(OPERATIONAL_STATUSES),
});
export type UpdateTenantOperationalStatusDto = z.infer<
  typeof UpdateTenantOperationalStatusSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// platform-billing

export const BillingListQuerySchema = z.object({
  search: z.string().optional(),
  paymentStatus: z.enum(TENANT_PAYMENT_STATUSES).optional(),
});
export type BillingListQueryDto = z.infer<typeof BillingListQuerySchema>;

export const PatchBillingOpsSchema = z.object({
  monthlyFeeInr: z.coerce.number().min(0).optional(),
  monthlyServerCostInr: z.coerce.number().min(0).optional(),
  paymentStatus: z.enum(TENANT_PAYMENT_STATUSES).optional(),
  lastPaidAt: z.string().datetime({ offset: true }).optional(),
  billingNotes: z.string().max(2000).optional(),
});
export type PatchBillingOpsDto = z.infer<typeof PatchBillingOpsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// platform-telemetry

export const TenantListQuerySchema = z.object({
  search: z.string().optional(),
});
export type TenantListQueryDto = z.infer<typeof TenantListQuerySchema>;
