import {
  parseUuidParam,
  requireAuth,
  validateJson,
  withApi,
} from "@sangam/api-kit";
import { Employees } from "@sangam/contracts";
import * as employeesService from "@/server/employees/employees-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["employees:write"]);
  const { id } = await params;
  const empId = parseUuidParam(id, "id");
  const dto = await validateJson(req, Employees.UpdateBankDetailsSchema);
  return employeesService.updateBankDetails(
    user.tenantId,
    empId,
    dto,
    user.sub,
  );
});
