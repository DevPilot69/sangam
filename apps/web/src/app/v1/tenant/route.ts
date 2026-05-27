import { requireAuth, validateJson, withApi } from "@sangam/api-kit";
import { Tenant } from "@sangam/contracts";
import * as tenantService from "@/server/tenant/tenant-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["settings:read"]);
  return tenantService.getCurrent(user.tenantId);
});

export const PATCH = withApi(async (req) => {
  const user = await requireAuth(req, ["settings:write"]);
  const dto = await validateJson(req, Tenant.UpdateTenantSchema);
  return tenantService.updateCurrent(user.tenantId, dto);
});
