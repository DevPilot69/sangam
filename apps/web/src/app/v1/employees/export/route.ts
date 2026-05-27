import { requireAuth, validateQuery, withApi } from "@sangam/api-kit";
import { Employees } from "@sangam/contracts";
import * as employeesService from "@/server/employees/employees-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["employees:read"]);
  const query = await validateQuery(req, Employees.ListEmployeesQuerySchema);
  const includeSensitive = (user.permissions ?? []).includes(
    "employees:write",
  );
  return employeesService.exportAll(user.tenantId, includeSensitive, query);
});
