import { SubscriptionStatus } from "@sangam/db";

/**
 * Tenant utility functions — ported from
 * src/modules/platform/platform-tenant.utils.ts (NestJS).
 *
 * `liveStatus` collapses the two-dimensional (subscription × onboarding)
 * state into the single five-value enum the platform dashboard renders.
 */

export type TenantLiveStatus =
  | "LIVE"
  | "TRIAL"
  | "SETUP"
  | "PAST_DUE"
  | "CHURNED";

const PLAN_FEES: Record<string, number> = {
  ENTERPRISE: 14999,
  GROWTH: 4999,
  STARTER: 2999,
  TRIAL: 0,
};

export function slugifyWorkspace(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return s.length > 0 ? s : "workspace";
}

export function monthlyFeeForPlan(
  planCode: string | null | undefined,
): number {
  if (!planCode) return PLAN_FEES.STARTER;
  return PLAN_FEES[planCode] ?? PLAN_FEES.GROWTH;
}

export function estimateServerCostInr(employeeCount: number): number {
  return Math.round(800 + Math.max(0, employeeCount) * 15);
}

export function deriveLiveStatus(opts: {
  onboardingCompletedAt: Date | null;
  subscriptionStatus: SubscriptionStatus | null | undefined;
}): TenantLiveStatus {
  const sub = opts.subscriptionStatus;
  if (sub === SubscriptionStatus.CANCELLED) return "CHURNED";
  if (sub === SubscriptionStatus.PAST_DUE) return "PAST_DUE";
  if (!opts.onboardingCompletedAt) return "SETUP";
  if (sub === SubscriptionStatus.TRIALING) return "TRIAL";
  if (sub === SubscriptionStatus.ACTIVE) return "LIVE";
  return "SETUP";
}
