import { requireAuth, validateJson, withApi } from "@sangam/api-kit";
import { Tenant } from "@sangam/contracts";
import * as tenantService from "@/server/tenant/tenant-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = withApi(async (req) => {
  const user = await requireAuth(req, ["settings:write"]);
  const dto = await validateJson(req, Tenant.PatchTenantSettingsSchema);
  return tenantService.patchSettings(user.tenantId, dto);
});
