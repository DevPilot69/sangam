import type { Billing } from "@sangam/contracts";

/**
 * Subscription pricing utilities — ported verbatim from
 * src/modules/billing/billing-pricing.ts (NestJS).
 *
 * Two pricing plans (STARTER / GROWTH), four billing cycles with cumulative
 * discounts. Centralised here so both the API and the front-end pricing page
 * resolve identical totals.
 */

const MONTHLY_BASE_INR: Record<Billing.BillingPlanCode, number> = {
  STARTER: 2999,
  GROWTH: 7999,
};

const CYCLE_MONTHS: Record<Billing.BillingCycle, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
};

const CYCLE_DISCOUNT: Record<Billing.BillingCycle, number> = {
  MONTHLY: 0,
  QUARTERLY: 0.05,
  HALF_YEARLY: 0.1,
  YEARLY: 0.15,
};

export const BILLING_CYCLE_LABELS: Record<Billing.BillingCycle, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly (5% off)",
  HALF_YEARLY: "Half-yearly (10% off)",
  YEARLY: "Yearly (15% off)",
};

export function cycleMonths(cycle: Billing.BillingCycle): number {
  return CYCLE_MONTHS[cycle];
}

export function calculateSubscriptionPrice(
  planCode: Billing.BillingPlanCode,
  cycle: Billing.BillingCycle,
) {
  const monthlyBaseInr = MONTHLY_BASE_INR[planCode];
  const months = CYCLE_MONTHS[cycle];
  const discountPercent = Math.round(CYCLE_DISCOUNT[cycle] * 100);
  const subtotalInr = monthlyBaseInr * months;
  const totalInr = Math.round(subtotalInr * (1 - CYCLE_DISCOUNT[cycle]));
  return {
    planCode,
    billingCycle: cycle,
    monthlyBaseInr,
    months,
    discountPercent,
    subtotalInr,
    totalInr,
    amountPaise: totalInr * 100,
  };
}

export function listPricingCatalog() {
  const plans: Billing.BillingPlanCode[] = ["STARTER", "GROWTH"];
  const cycles: Billing.BillingCycle[] = [
    "MONTHLY",
    "QUARTERLY",
    "HALF_YEARLY",
    "YEARLY",
  ];
  return plans.map((planCode) => ({
    planCode,
    name: planCode === "STARTER" ? "Starter" : "Growth",
    description:
      planCode === "STARTER"
        ? "10–50 employees · core payroll & employee portal"
        : "51–200 employees · priority support",
    monthlyBaseInr: MONTHLY_BASE_INR[planCode],
    options: cycles.map((billingCycle) => {
      const quote = calculateSubscriptionPrice(planCode, billingCycle);
      return {
        billingCycle,
        label: BILLING_CYCLE_LABELS[billingCycle],
        months: quote.months,
        discountPercent: quote.discountPercent,
        subtotalInr: quote.subtotalInr,
        totalInr: quote.totalInr,
      };
    }),
  }));
}

export function periodEndFromCycle(
  cycle: Billing.BillingCycle,
  from = new Date(),
): Date {
  const end = new Date(from);
  end.setMonth(end.getMonth() + CYCLE_MONTHS[cycle]);
  return end;
}
