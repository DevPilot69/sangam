import { z } from "zod";

export const BILLING_PLAN_CODES = ["STARTER", "GROWTH"] as const;
export type BillingPlanCode = (typeof BILLING_PLAN_CODES)[number];

export const BILLING_CYCLES = [
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/billing/subscribe

export const CreateSubscriptionSchema = z.object({
  planCode: z.enum(BILLING_PLAN_CODES),
  billingCycle: z.enum(BILLING_CYCLES),
});
export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/billing/verify-payment

export const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
export type VerifyPaymentDto = z.infer<typeof VerifyPaymentSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/billing/quote

export const BillingQuoteQuerySchema = z.object({
  planCode: z.enum(BILLING_PLAN_CODES),
  billingCycle: z.enum(BILLING_CYCLES),
});
export type BillingQuoteQueryDto = z.infer<typeof BillingQuoteQuerySchema>;
