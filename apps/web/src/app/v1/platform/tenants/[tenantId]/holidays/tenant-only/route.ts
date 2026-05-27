import {
  parseUuidParam,
  requirePlatformAuth,
  validateQuery,
  withApi,
} from "@sangam/api-kit";
import { Tenant } from "@sangam/contracts";
import * as holidays from "@/server/tenant/holidays-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;
  const q = await validateQuery(req, Tenant.ListHolidaysQuerySchema);
  return holidays.listTenantOnly(parseUuidParam(tenantId, "tenantId"), q);
});
