import {
  ForbiddenError,
  parseUuidParam,
  requireAuth,
  validateJson,
  validateQuery,
  withApi,
} from "@sangam/api-kit";
import { Employees } from "@sangam/contracts";
import * as employeesService from "@/server/employees/employees-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["employees:read"]);
  const { id } = await params;
  const empId = parseUuidParam(id, "id");
  const query = await validateQuery(req, Employees.GetEmployeeQuerySchema);

  const revealBank =
    query.reveal === "bank" &&
    (user.permissions ?? []).includes("employees:write");
  if (query.reveal === "bank" && !revealBank) {
    throw new ForbiddenError(
      "employees:write required to reveal bank details",
    );
  }
  return employeesService.findOne(user.tenantId, empId, { revealBank });
});

export const PATCH = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["employees:write"]);
  const { id } = await params;
  const empId = parseUuidParam(id, "id");
  const dto = await validateJson(req, Employees.UpdateEmployeeSchema);
  return employeesService.update(user.tenantId, empId, dto, user.sub);
});

export const DELETE = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["employees:write"]);
  const { id } = await params;
  const empId = parseUuidParam(id, "id");
  return employeesService.remove(user.tenantId, empId, user.sub);
});
