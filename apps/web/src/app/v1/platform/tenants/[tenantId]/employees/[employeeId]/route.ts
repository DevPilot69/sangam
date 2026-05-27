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

type Ctx = { params: Promise<{ tenantId: string; employeeId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, employeeId } = await params;
  const q = await validateQuery(req, Employees.GetEmployeeQuerySchema);
  return employeesService.findOne(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(employeeId, "employeeId"),
    { revealBank: q.reveal === "bank" },
  );
});

export const PATCH = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, employeeId } = await params;
  const dto = await validateJson(req, Employees.UpdateEmployeeSchema);
  return employeesService.update(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(employeeId, "employeeId"),
    dto,
    null,
  );
});

export const DELETE = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, employeeId } = await params;
  return employeesService.remove(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(employeeId, "employeeId"),
    null,
  );
});
