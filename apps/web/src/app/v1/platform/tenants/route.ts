import {
  requirePlatformAuth,
  validateJson,
  validateQuery,
  withApi,
} from "@sangam/api-kit";
import { Platform } from "@sangam/contracts";
import * as telemetry from "@/server/platform/platform-telemetry-service";
import * as tenants from "@/server/platform/platform-tenants-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = withApi(async (req) => {
  await requirePlatformAuth(req);
  const q = await validateQuery(req, Platform.TenantListQuerySchema);
  return telemetry.listTenants({ search: q.search });
});

export const POST = withApi(async (req) => {
  await requirePlatformAuth(req);
  const dto = await validateJson(req, Platform.ProvisionTenantSchema);
  return tenants.provision(dto);
});
