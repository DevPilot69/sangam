import { requireAuth, validateQuery, withApi } from "@sangam/api-kit";
import { Leave } from "@sangam/contracts";
import * as leave from "@/server/leave/leave-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["leave:read"]);
  const query = await validateQuery(req, Leave.ListLeaveQuerySchema);
  return leave.listRequests(user.tenantId, {
    status: query.status,
    limit: query.limit,
  });
});
