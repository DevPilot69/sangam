import {
  parseUuidParam,
  requirePlatformAuth,
  validateJson,
  withApi,
} from "@sangam/api-kit";
import { Employees } from "@sangam/contracts";
import * as employeesService from "@/server/employees/employees-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string; employeeId: string }> };

export const PATCH = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, employeeId } = await params;
  const dto = await validateJson(req, Employees.UpdateBankDetailsSchema);
  return employeesService.updateBankDetails(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(employeeId, "employeeId"),
    dto,
    null,
  );
});
