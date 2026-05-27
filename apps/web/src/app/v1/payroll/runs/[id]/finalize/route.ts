import {
  parseUuidParam,
  requireAuth,
  validateJson,
  withApi,
} from "@sangam/api-kit";
import { Payroll } from "@sangam/contracts";
import * as payroll from "@/server/payroll/payroll-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Long-running route — payroll finalize re-validates, re-previews, locks the
 * run, and re-inserts entries. On Vercel this is allowed up to 300s via
 * `vercel.json` -> functions["src/app/v1/payroll/runs/[id]/finalize/route.ts"].
 */
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["payroll:run"]);
  const { id } = await params;
  const runId = parseUuidParam(id, "id");
  const dto = await validateJson(req, Payroll.FinalizePayrollRunSchema);
  return payroll.finalizeRun(user.tenantId, runId, dto);
});
