import { requireAuth, validateQuery, withApi } from "@sangam/api-kit";
import { Audit } from "@sangam/contracts";
import * as audit from "@/server/audit/audit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["settings:read"]);
  const q = await validateQuery(req, Audit.ListAuditQuerySchema);
  return audit.list(user.tenantId, q);
});
