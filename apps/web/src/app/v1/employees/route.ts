import {
  requireAuth,
  validateJson,
  validateQuery,
  withApi,
} from "@sangam/api-kit";
import { Employees } from "@sangam/contracts";
import * as employeesService from "@/server/employees/employees-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["employees:read"]);
  const query = await validateQuery(req, Employees.ListEmployeesQuerySchema);
  return employeesService.list(user.tenantId, query);
});

export const POST = withApi(async (req) => {
  const user = await requireAuth(req, ["employees:write"]);
  const dto = await validateJson(req, Employees.CreateEmployeeSchema);
  return employeesService.create(user.tenantId, dto);
});
