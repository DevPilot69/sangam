import {
  requirePlatformAuth,
  validateJson,
  validateQuery,
  withApi,
} from "@sangam/api-kit";
import { Tenant } from "@sangam/contracts";
import * as holidays from "@/server/tenant/holidays-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  await requirePlatformAuth(req);
  const q = await validateQuery(req, Tenant.ListHolidaysQuerySchema);
  return holidays.listPlatform(q);
});

export const POST = withApi(async (req) => {
  await requirePlatformAuth(req);
  const dto = await validateJson(req, Tenant.CreateHolidaysSchema);
  return holidays.upsertManyPlatform(dto);
});
