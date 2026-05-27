import {
  requireAuth,
  validateJson,
  validateQuery,
  withApi,
} from "@sangam/api-kit";
import { Tenant } from "@sangam/contracts";
import * as holidaysService from "@/server/tenant/holidays-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["settings:read"]);
  const query = await validateQuery(req, Tenant.ListHolidaysQuerySchema);
  return holidaysService.list(user.tenantId, query);
});

export const POST = withApi(async (req) => {
  const user = await requireAuth(req, ["settings:write"]);
  const dto = await validateJson(req, Tenant.CreateHolidaysSchema);
  return holidaysService.upsertMany(user.tenantId, dto);
});
