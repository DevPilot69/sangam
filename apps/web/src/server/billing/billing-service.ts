import { prisma, SubscriptionStatus, TenantPaymentStatus } from "@sangam/db";
import { BadRequestError, NotFoundError } from "@sangam/api-kit";
import type { Billing } from "@sangam/contracts";
import { razorpay } from "@sangam/demo";
import {
  calculateSubscriptionPrice,
  listPricingCatalog,
  periodEndFromCycle,
} from "./billing-pricing";
import { buildVetanInvoiceHtml } from "../shared/documents/vetan-invoice-html";

/**
 * Billing service — ported from src/modules/billing/billing.service.ts.
 *
 * In Phase 4 we route every Razorpay call through `@sangam/demo`'s mock
 * provider. The real client (`razorpay` npm package) is only used when
 * `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are set AND `DEMO_MODE=false`.
 * The provider's `isRazorpayConfigured()` enforces both gates.
 *
 * Demo behaviour preserves the contract the front-end already consumes
 * (`mock: true/false`, `orderId`, `quote`, `keyId`) so the existing
 * `lib/api/billing.ts` checkout flow keeps working without changes.
 */

function trialDays(): number {
  const env = process.env.BILLING_TRIAL_DAYS;
  const parsed = env ? Number(env) : 14;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 14;
}

export async function ensureTrialSubscription(tenantId: string) {
  const existing = await prisma.subscription.findUnique({
    where: { tenantId },
  });
  if (existing) return existing;

  const trialEndsAt = new Date(
    Date.now() + trialDays() * 24 * 60 * 60 * 1000,
  );
  return prisma.subscription.create({
    data: {
      tenantId,
      status: SubscriptionStatus.TRIALING,
      planCode: "TRIAL",
      trialEndsAt,
    },
  });
}

export function getPricingCatalog() {
  return { plans: listPricingCatalog() };
}

export function getQuote(
  planCode: Billing.BillingPlanCode,
  billingCycle: Billing.BillingCycle,
) {
  return calculateSubscriptionPrice(planCode, billingCycle);
}

function resolveAccess(sub: {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}): { allowed: boolean; reason: string } {
  if (sub.status === SubscriptionStatus.ACTIVE) {
    return { allowed: true, reason: "active_subscription" };
  }
  if (
    sub.status === SubscriptionStatus.TRIALING &&
    sub.trialEndsAt &&
    sub.trialEndsAt > new Date()
  ) {
    return { allowed: true, reason: "trial" };
  }
  if (
    sub.status === SubscriptionStatus.PAST_DUE &&
    sub.currentPeriodEnd &&
    sub.currentPeriodEnd > new Date()
  ) {
    return { allowed: true, reason: "grace_period" };
  }
  return { allowed: false, reason: "subscription_required" };
}

export async function getSummary(tenantId: string) {
  const sub = await ensureTrialSubscription(tenantId);
  const employeeCount = await prisma.employee.count({
    where: { tenantId, deletedAt: null, status: "ACTIVE" },
  });
  const access = resolveAccess(sub);
  return {
    status: sub.status,
    planCode: sub.planCode,
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    razorpaySubscriptionId: sub.razorpaySubscriptionId,
    employeeCount,
    trialDaysTotal: trialDays(),
    hasPaidAccess: access.allowed,
    accessReason: access.reason,
    razorpayConfigured: razorpay.isRazorpayConfigured(),
    razorpayKeyId: razorpay.isRazorpayConfigured()
      ? process.env.RAZORPAY_KEY_ID ?? null
      : null,
  };
}

export async function createCheckout(
  tenantId: string,
  user: { email: string; name: string },
  dto: Billing.CreateSubscriptionDto,
) {
  const { planCode, billingCycle } = dto;
  const quote = calculateSubscriptionPrice(planCode, billingCycle);
  await ensureTrialSubscription(tenantId);

  if (!razorpay.isRazorpayConfigured()) {
    return mockActivateSubscription(
      tenantId,
      planCode,
      billingCycle,
      quote.totalInr,
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) throw new NotFoundError("Tenant not found");

  const order = await razorpay.createOrder({
    amount: quote.amountPaise,
    currency: "INR",
    receipt: `sub_${tenantId.slice(0, 8)}_${Date.now()}`,
    notes: {
      tenantId,
      planCode,
      billingCycle,
      totalInr: String(quote.totalInr),
    },
  });

  return {
    mock: false,
    planCode,
    billingCycle,
    quote,
    orderId: order.id,
    amount: quote.amountPaise,
    currency: "INR",
    subscriptionId: null,
    shortUrl: null,
    status: "created",
    keyId: process.env.RAZORPAY_KEY_ID ?? null,
    prefill: { name: user.name, email: user.email },
  };
}

async function mockActivateSubscription(
  tenantId: string,
  planCode: Billing.BillingPlanCode,
  billingCycle: Billing.BillingCycle,
  totalInr: number,
) {
  const periodEnd = periodEndFromCycle(billingCycle);
  await prisma.subscription.update({
    where: { tenantId },
    data: {
      status: SubscriptionStatus.ACTIVE,
      planCode,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
      razorpaySubscriptionId: `mock_sub_${tenantId.slice(0, 8)}`,
    },
  });
  await syncBillingOpsPaid(tenantId);
  await appendPaidSubscriptionInvoice(
    tenantId,
    totalInr > 0 ? totalInr : undefined,
  );
  return {
    mock: true,
    planCode,
    billingCycle,
    quote: calculateSubscriptionPrice(planCode, billingCycle),
    orderId: null,
    amount: totalInr * 100,
    currency: "INR",
    subscriptionId: null,
    shortUrl: null,
    status: "active",
    keyId: null,
    message:
      "Razorpay keys not configured (or DEMO_MODE=true) — subscription activated in mock mode.",
  };
}

export async function verifyAndActivate(
  tenantId: string,
  dto: Billing.VerifyPaymentDto,
) {
  if (!razorpay.isRazorpayConfigured()) {
    throw new BadRequestError("Razorpay is not configured");
  }
  if (
    !razorpay.verifyPaymentSignature(
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    )
  ) {
    throw new BadRequestError("Invalid payment signature");
  }

  const order = await razorpay.fetchOrder(dto.razorpay_order_id);
  if (!order) {
    throw new BadRequestError("Order not found");
  }
  if (order.notes?.tenantId !== tenantId) {
    throw new BadRequestError("Order does not belong to this workspace");
  }

  const planCode = (order.notes?.planCode ?? "GROWTH") as Billing.BillingPlanCode;
  const billingCycle = (order.notes?.billingCycle ??
    "MONTHLY") as Billing.BillingCycle;
  const totalInr = Number(order.notes?.totalInr ?? 0);

  const periodEnd = periodEndFromCycle(billingCycle);
  await prisma.subscription.update({
    where: { tenantId },
    data: {
      status: SubscriptionStatus.ACTIVE,
      planCode,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
      razorpaySubscriptionId: dto.razorpay_payment_id,
    },
  });
  await syncBillingOpsPaid(tenantId);
  if (totalInr > 0) {
    await appendPaidSubscriptionInvoice(tenantId, totalInr);
  } else {
    await appendPaidSubscriptionInvoice(tenantId);
  }

  return {
    ok: true,
    planCode,
    billingCycle,
    currentPeriodEnd: periodEnd.toISOString(),
  };
}

type RazorpaySubscriptionEntity = razorpay.RazorpaySubscriptionEntity;

export async function handleWebhook(
  rawBody: Buffer | Uint8Array,
  signature: string | undefined,
) {
  if (!razorpay.verifyWebhookSignature(rawBody, signature)) {
    throw new BadRequestError("Invalid webhook signature");
  }

  const payload = JSON.parse(Buffer.from(rawBody).toString("utf8")) as {
    event: string;
    payload?: {
      subscription?: { entity: RazorpaySubscriptionEntity };
      payment?: { entity: { amount: number; currency: string } };
    };
  };

  const event = payload.event;
  const entity = payload.payload?.subscription?.entity;

  if (entity?.id) {
    await applyRazorpaySubscription(entity, event);
  }

  if (event === "subscription.charged" && entity) {
    await recordSubscriptionCharge(entity);
  }

  return { received: true, event };
}

async function applyRazorpaySubscription(
  entity: RazorpaySubscriptionEntity,
  event: string,
) {
  const tenantId = entity.notes?.tenantId;
  let sub = tenantId
    ? await prisma.subscription.findUnique({ where: { tenantId } })
    : null;

  if (!sub) {
    sub = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: entity.id },
    });
  }
  if (!sub) {
    return;
  }

  const planCode = entity.notes?.planCode ?? sub.planCode ?? "GROWTH";
  let status = sub.status;
  let currentPeriodEnd = sub.currentPeriodEnd;

  if (entity.current_end) {
    currentPeriodEnd = new Date(entity.current_end * 1000);
  }

  switch (event) {
    case "subscription.authenticated":
    case "subscription.activated":
    case "subscription.resumed":
      status = SubscriptionStatus.ACTIVE;
      break;
    case "subscription.pending":
    case "subscription.halted":
      status = SubscriptionStatus.PAST_DUE;
      break;
    case "subscription.cancelled":
    case "subscription.completed":
      status = SubscriptionStatus.CANCELLED;
      break;
    case "subscription.charged":
      status = SubscriptionStatus.ACTIVE;
      break;
    default:
      if (entity.status === "active") {
        status = SubscriptionStatus.ACTIVE;
      }
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      razorpaySubscriptionId: entity.id,
      razorpayCustomerId: entity.customer_id ?? sub.razorpayCustomerId,
      status,
      planCode,
      currentPeriodEnd,
      trialEndsAt:
        status === SubscriptionStatus.ACTIVE ? null : sub.trialEndsAt,
    },
  });

  if (status === SubscriptionStatus.ACTIVE && currentPeriodEnd) {
    await syncBillingOpsPaid(sub.tenantId);
  }
}

async function recordSubscriptionCharge(entity: RazorpaySubscriptionEntity) {
  const sub = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: entity.id },
  });
  if (!sub) return;
  await appendPaidSubscriptionInvoice(sub.tenantId);
}

async function monthlyFeeForTenant(tenantId: string): Promise<number> {
  const ops = await prisma.tenantBillingOps.findUnique({
    where: { tenantId },
  });
  if (ops) return Number(ops.monthlyFeeInr);
  return 4999;
}

async function appendPaidSubscriptionInvoice(
  tenantId: string,
  amountOverride?: number,
): Promise<number> {
  const sub = await prisma.subscription.findUnique({
    where: { tenantId },
  });
  if (!sub) return 0;

  const now = new Date();
  const amount = amountOverride ?? (await monthlyFeeForTenant(tenantId));
  await prisma.invoice.create({
    data: {
      subscriptionId: sub.id,
      amount,
      currency: "INR",
      status: "paid",
      periodYear: now.getFullYear(),
      periodMonth: now.getMonth() + 1,
      paidAt: now,
    },
  });
  return Number(amount);
}

export async function listInvoicesForTenant(tenantId: string) {
  await ensureTrialSubscription(tenantId);
  const sub = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { id: true },
  });
  if (!sub) return [];

  const rows = await prisma.invoice.findMany({
    where: { subscriptionId: sub.id },
    orderBy: [
      { periodYear: "desc" },
      { periodMonth: "desc" },
      { createdAt: "desc" },
    ],
  });

  return rows.map((inv) => ({
    id: inv.id,
    amount: Number(inv.amount),
    currency: inv.currency,
    status: inv.status,
    periodYear: inv.periodYear,
    periodMonth: inv.periodMonth,
    paidAt: inv.paidAt?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
    pdfUrl: inv.pdfUrl,
  }));
}

export async function buildInvoiceDownloadPayload(
  tenantId: string,
  invoiceId: string,
) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      subscription: { tenantId },
    },
    include: {
      subscription: {
        include: { tenant: { select: { name: true, slug: true } } },
      },
    },
  });
  if (!invoice) throw new NotFoundError("Invoice not found");

  const tenant = invoice.subscription.tenant;
  const periodLabel =
    invoice.periodYear && invoice.periodMonth
      ? `${String(invoice.periodMonth).padStart(2, "0")}/${invoice.periodYear}`
      : "—";

  const html = buildVetanInvoiceHtml({
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    periodLabel,
    amountInr: Number(invoice.amount),
    currency: invoice.currency,
    paidAt: invoice.paidAt?.toISOString().slice(0, 10) ?? null,
    invoiceId: invoice.id,
    status: invoice.status,
  });

  const safePeriod = periodLabel.replace("/", "-");
  return {
    html,
    filename: `vetan-invoice-${tenant.slug}-${safePeriod}.html`,
  };
}

async function syncBillingOpsPaid(tenantId: string) {
  await prisma.tenantBillingOps.upsert({
    where: { tenantId },
    create: {
      tenantId,
      monthlyFeeInr: 4999,
      monthlyServerCostInr: 800,
      paymentStatus: TenantPaymentStatus.PAID,
      lastPaidAt: new Date(),
    },
    update: {
      paymentStatus: TenantPaymentStatus.PAID,
      lastPaidAt: new Date(),
    },
  });
}
