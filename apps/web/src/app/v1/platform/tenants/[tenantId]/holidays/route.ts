import {
  parseUuidParam,
  requirePlatformAuth,
  validateJson,
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
  return holidays.listEffectiveForTenant(
    parseUuidParam(tenantId, "tenantId"),
    q,
  );
});

export const POST = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;
  const dto = await validateJson(req, Tenant.CreateHolidaysSchema);
  return holidays.upsertMany(parseUuidParam(tenantId, "tenantId"), dto);
});
