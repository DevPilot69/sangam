import type { NextRequest } from "next/server";
import { withApi, type RouteHandler } from "./envelope";

/**
 * Variant of `withApi` for routes that need to inspect the *raw* request body
 * (most importantly: Razorpay's webhook, which signs the unparsed JSON bytes).
 *
 * Replaces the express-level setup in the old NestJS main.ts:
 *
 *   app.use('/v1/billing/webhooks/razorpay', raw({ type: 'application/json' }));
 *
 * Usage:
 *
 *   export const POST = withRawBody(async (req, _ctx, raw) => {
 *     const sig = req.headers.get("x-razorpay-signature") ?? "";
 *     return billingService.handleWebhook(raw, sig);
 *   });
 */
export type RawBodyHandler<Ctx = unknown> = (
  req: NextRequest,
  ctx: Ctx,
  raw: Buffer,
) => Promise<unknown> | unknown;

export function withRawBody<Ctx = unknown>(
  handler: RawBodyHandler<Ctx>,
): (req: NextRequest, ctx: Ctx) => Promise<Response> {
  const wrapped: RouteHandler<Ctx> = async (req, ctx) => {
    const ab = await req.arrayBuffer();
    const raw = Buffer.from(ab);
    return handler(req, ctx, raw);
  };
  return withApi(wrapped);
}
