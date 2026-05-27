import { requireAuth, validateJson, withApi } from "@sangam/api-kit";
import { Reports } from "@sangam/contracts";
import * as reports from "@/server/reports/reports-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const POST = withApi(async (req) => {
  const user = await requireAuth(req, ["reports:read"]);
  const dto = await validateJson(req, Reports.RunReportSchema);
  return reports.run(user.tenantId, dto);
});
