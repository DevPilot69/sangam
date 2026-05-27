import { requireAuth, validateQuery, withApi } from "@sangam/api-kit";
import { Billing } from "@sangam/contracts";
import * as billing from "@/server/billing/billing-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  await requireAuth(req, ["billing:read"]);
  const q = await validateQuery(req, Billing.BillingQuoteQuerySchema);
  return billing.getQuote(q.planCode, q.billingCycle);
});
