import {
  requireAuth,
  validateJson,
  validateQuery,
  withApi,
} from "@sangam/api-kit";
import { Payroll } from "@sangam/contracts";
import * as payroll from "@/server/payroll/payroll-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["payroll:read"]);
  const query = await validateQuery(req, Payroll.ListPayrollRunsQuerySchema);
  return payroll.listRuns(user.tenantId, query.limit ?? 24);
});

export const POST = withApi(async (req) => {
  const user = await requireAuth(req, ["payroll:run"]);
  const dto = await validateJson(req, Payroll.CreatePayrollRunSchema);
  return payroll.createRun(user.tenantId, user.sub, dto);
});
