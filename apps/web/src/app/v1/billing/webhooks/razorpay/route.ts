import { BadRequestError, withRawBody } from "@sangam/api-kit";
import * as billing from "@/server/billing/billing-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook entrypoint.
 *
 * Replaces the express raw-body middleware from NestJS:
 *   app.use('/v1/billing/webhooks/razorpay', raw({ type: 'application/json' }));
 *
 * `withRawBody` gives us the unparsed bytes so signature verification
 * can recompute the HMAC over the exact payload Razorpay signed.
 *
 * In demo mode the signature check is bypassed inside the mock provider,
 * which lets the front-end's "Simulate Razorpay webhook" admin button
 * exercise the activation/cancel flows without a live merchant account.
 */
export const POST = withRawBody(async (req, _ctx, raw) => {
  if (!raw.length) {
    throw new BadRequestError("Missing raw body for webhook verification");
  }
  const sig = req.headers.get("x-razorpay-signature") ?? undefined;
  return billing.handleWebhook(raw, sig);
});
