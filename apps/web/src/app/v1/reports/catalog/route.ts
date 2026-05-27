import { requireAuth, withApi } from "@sangam/api-kit";
import * as reports from "@/server/reports/reports-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  await requireAuth(req, ["reports:read"]);
  return reports.catalog();
});
