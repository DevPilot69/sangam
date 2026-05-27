import {
  parseUuidParam,
  requirePlatformAuth,
  validateJson,
  withApi,
} from "@sangam/api-kit";
import { Tenant } from "@sangam/contracts";
import * as designations from "@/server/tenant/designations-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;
  return designations.list(parseUuidParam(tenantId, "tenantId"));
});

export const POST = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;
  const dto = await validateJson(req, Tenant.CreateDesignationSchema);
  return designations.create(parseUuidParam(tenantId, "tenantId"), dto);
});
