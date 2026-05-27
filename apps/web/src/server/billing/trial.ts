import { prisma, SubscriptionStatus } from "@sangam/db";

/**
 * Provisions a trial subscription for a freshly-registered tenant.
 * Ported from src/modules/billing/billing.service.ts:53-70.
 *
 * Lives in the server/billing slice so auth -> registration can call it
 * without a full dependency on the (yet-to-be-ported) billing module.
 */
export function trialDays(): number {
  const raw = process.env.BILLING_TRIAL_DAYS;
  const n = raw ? Number(raw) : 14;
  return Number.isFinite(n) && n > 0 ? n : 14;
}

export async function ensureTrialSubscription(tenantId: string) {
  const existing = await prisma.subscription.findUnique({
    where: { tenantId },
  });
  if (existing) return existing;

  const trialEndsAt = new Date(Date.now() + trialDays() * 86400 * 1000);
  return prisma.subscription.create({
    data: {
      tenantId,
      status: SubscriptionStatus.TRIALING,
      planCode: "TRIAL",
      trialEndsAt,
    },
  });
}
