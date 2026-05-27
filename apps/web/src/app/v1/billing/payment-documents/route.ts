import { requireAuth, withApi } from "@sangam/api-kit";
import * as financialDocs from "@/server/billing/financial-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["billing:read"]);
  return financialDocs.listPaymentDocuments(user.tenantId);
});
