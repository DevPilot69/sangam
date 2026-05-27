import {
  parseUuidParam,
  requirePlatformAuth,
  validateJson,
  validateQuery,
  withApi,
} from "@sangam/api-kit";
import { Employees } from "@sangam/contracts";
import * as employeesService from "@/server/employees/employees-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;
  const q = await validateQuery(req, Employees.ListEmployeesQuerySchema);
  return employeesService.list(parseUuidParam(tenantId, "tenantId"), q);
});

export const POST = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;
  const dto = await validateJson(req, Employees.CreateEmployeeSchema);
  return employeesService.create(parseUuidParam(tenantId, "tenantId"), dto);
});
