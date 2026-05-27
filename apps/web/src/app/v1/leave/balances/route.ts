import { requireAuth, withApi } from "@sangam/api-kit";
import * as leave from "@/server/leave/leave-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["leave:read"]);
  return leave.listBalances(user.tenantId);
});
