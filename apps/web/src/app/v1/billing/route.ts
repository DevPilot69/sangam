import { requireAuth, withApi } from "@sangam/api-kit";
import * as billing from "@/server/billing/billing-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["billing:read"]);
  return billing.getSummary(user.tenantId);
});
