import { createHmac, randomBytes } from "crypto";
import { isDemoMode } from "./demo-mode";

/**
 * Razorpay mock provider.
 *
 * Surface mirrors the slice of the real `razorpay` npm client we use
 * (`orders.create`, `orders.fetch`, signature helpers, webhook verification)
 * so swapping back to the real client at Phase 6 is mechanical.
 *
 * Demo behaviour:
 *  - `createOrder({ amount, notes })` generates a synthetic `order_<rand>` id
 *    and keeps the payload in memory so a subsequent `orders.fetch` returns
 *    the same `notes` payload (tenantId/planCode/billingCycle etc.).
 *  - `verifyPaymentSignature(...)` ALWAYS succeeds in demo mode. The real
 *    HMAC check is implemented for the prod path but the demo bypasses it.
 *  - `verifyWebhookSignature(...)` ALWAYS succeeds in demo mode. Real HMAC
 *    check stays available.
 *  - `synthesizeWebhookEvent({ event, subscriptionId, tenantId })` produces a
 *    plausible Razorpay webhook payload buffer that can be fed back into
 *    `billing.handleWebhook()` for demoing the activation/cancel flows
 *    without a real Razorpay account.
 *
 * Note on in-memory order store: serverless containers are ephemeral, so
 * orders only survive for the duration of a single Lambda container. That's
 * fine for the immediate "create order then verify" flow which happens on
 * the same invocation chain, and good enough for demos. Phase 6 swap pulls
 * in the real SDK and removes this entirely.
 */

const orderStore = new Map<
  string,
  { id: string; amount: number; notes: Record<string, string>; createdAt: number }
>();

export type RazorpayOrderInput = {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
};

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string;
  notes?: Record<string, string>;
};

export type RazorpaySubscriptionEntity = {
  id: string;
  status: string;
  plan_id: string;
  current_end?: number;
  customer_id?: string;
  notes?: Record<string, string>;
};

function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function isRazorpayConfigured(): boolean {
  if (isDemoMode()) return false;
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    id &&
      secret &&
      !id.includes("placeholder") &&
      secret !== "placeholder",
  );
}

export async function createOrder(
  input: RazorpayOrderInput,
): Promise<RazorpayOrder> {
  const id = randomId("order");
  const notes = input.notes ?? {};
  orderStore.set(id, {
    id,
    amount: input.amount,
    notes,
    createdAt: Date.now(),
  });
  return {
    id,
    amount: input.amount,
    currency: input.currency,
    status: "created",
    receipt: input.receipt,
    notes,
  };
}

export async function fetchOrder(
  id: string,
): Promise<RazorpayOrder | null> {
  const row = orderStore.get(id);
  if (!row) return null;
  return {
    id: row.id,
    amount: row.amount,
    currency: "INR",
    status: "created",
    receipt: `mock_receipt_${row.id}`,
    notes: row.notes,
  };
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  if (isDemoMode()) return true;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

export function verifyWebhookSignature(
  rawBody: Buffer | Uint8Array,
  signature: string | undefined,
): boolean {
  if (isDemoMode()) return true;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!signature) return false;
  const expected = createHmac("sha256", secret)
    .update(Buffer.from(rawBody))
    .digest("hex");
  return expected === signature;
}

/**
 * Synthesise a webhook payload — drives the admin "Simulate Razorpay webhook"
 * button in demo mode. Lets the front-end exercise the activate/cancel paths
 * without a live Razorpay sandbox.
 */
export function synthesizeWebhookEvent(opts: {
  event:
    | "subscription.authenticated"
    | "subscription.activated"
    | "subscription.charged"
    | "subscription.pending"
    | "subscription.halted"
    | "subscription.cancelled";
  subscriptionId?: string;
  tenantId?: string;
  planCode?: string;
}): Buffer {
  const subscriptionId =
    opts.subscriptionId ?? randomId("sub");
  const current_end = Math.floor(
    new Date().setMonth(new Date().getMonth() + 1) / 1000,
  );
  const entity: RazorpaySubscriptionEntity = {
    id: subscriptionId,
    status: "active",
    plan_id: `plan_${opts.planCode ?? "GROWTH"}`,
    current_end,
    customer_id: randomId("cust"),
    notes: {
      ...(opts.tenantId && { tenantId: opts.tenantId }),
      ...(opts.planCode && { planCode: opts.planCode }),
    },
  };
  const payload = {
    event: opts.event,
    payload: {
      subscription: { entity },
    },
  };
  return Buffer.from(JSON.stringify(payload), "utf8");
}
