import { requireAuth, withApi } from "@sangam/api-kit";
import * as dashboard from "@/server/dashboard/dashboard-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["payroll:read"]);
  return dashboard.summary(user.tenantId);
});
