import { requireAuth, validateJson, withApi } from "@sangam/api-kit";
import { Employees } from "@sangam/contracts";
import * as employeesService from "@/server/employees/employees-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApi(async (req) => {
  const user = await requireAuth(req, ["employees:write"]);
  const dto = await validateJson(req, Employees.BulkImportEmployeesSchema);
  return employeesService.bulkImport(user.tenantId, dto.rows);
});
