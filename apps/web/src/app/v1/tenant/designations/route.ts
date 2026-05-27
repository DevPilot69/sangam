import { requireAuth, validateJson, withApi } from "@sangam/api-kit";
import { Tenant } from "@sangam/contracts";
import * as designationsService from "@/server/tenant/designations-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["settings:read"]);
  return designationsService.list(user.tenantId);
});

export const POST = withApi(async (req) => {
  const user = await requireAuth(req, ["settings:write"]);
  const dto = await validateJson(req, Tenant.CreateDesignationSchema);
  return designationsService.create(user.tenantId, dto);
});
