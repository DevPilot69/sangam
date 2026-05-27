import {
  parseUuidParam,
  requireAuth,
  validateJson,
  withApi,
} from "@sangam/api-kit";
import { Tenant } from "@sangam/contracts";
import * as designationsService from "@/server/tenant/designations-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["settings:write"]);
  const { id } = await params;
  const desId = parseUuidParam(id, "id");
  const dto = await validateJson(req, Tenant.UpdateDesignationSchema);
  return designationsService.update(user.tenantId, desId, dto);
});

export const DELETE = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["settings:write"]);
  const { id } = await params;
  const desId = parseUuidParam(id, "id");
  return designationsService.remove(user.tenantId, desId);
});
