import { parseUuidParam, requireAuth, withApi } from "@sangam/api-kit";
import * as payroll from "@/server/payroll/payroll-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["payroll:read"]);
  const { id } = await params;
  const runId = parseUuidParam(id, "id");
  return payroll.previewRun(user.tenantId, runId);
});
