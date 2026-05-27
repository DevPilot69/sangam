import { requireAuth, withApi } from "@sangam/api-kit";
import * as payroll from "@/server/payroll/payroll-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["payroll:read"]);
  return payroll.trend(user.tenantId);
});
