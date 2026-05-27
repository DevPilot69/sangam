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

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["payroll:read"]);
  const { id } = await params;
  const runId = parseUuidParam(id, "id");
  return payroll.getSetup(user.tenantId, runId);
});

export const PATCH = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["payroll:run"]);
  const { id } = await params;
  const runId = parseUuidParam(id, "id");
  const dto = await validateJson(req, Payroll.UpdatePayrollSetupSchema);
  return payroll.updateSetup(user.tenantId, runId, dto);
});
