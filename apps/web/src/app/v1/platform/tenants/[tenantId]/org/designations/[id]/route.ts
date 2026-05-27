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

type Ctx = { params: Promise<{ tenantId: string; id: string }> };

export const PATCH = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, id } = await params;
  const dto = await validateJson(req, Tenant.UpdateDesignationSchema);
  return designations.update(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(id, "id"),
    dto,
  );
});

export const DELETE = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, id } = await params;
  return designations.remove(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(id, "id"),
  );
});
