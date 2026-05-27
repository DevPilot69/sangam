import {
  parseUuidParam,
  requireAuth,
  validateJson,
  withApi,
} from "@sangam/api-kit";
import { Tenant } from "@sangam/contracts";
import * as departmentsService from "@/server/tenant/departments-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["settings:write"]);
  const { id } = await params;
  const deptId = parseUuidParam(id, "id");
  const dto = await validateJson(req, Tenant.UpdateDepartmentSchema);
  return departmentsService.update(user.tenantId, deptId, dto);
});

export const DELETE = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["settings:write"]);
  const { id } = await params;
  const deptId = parseUuidParam(id, "id");
  return departmentsService.remove(user.tenantId, deptId);
});
