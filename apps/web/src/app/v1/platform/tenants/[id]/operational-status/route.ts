import {
  parseUuidParam,
  requirePlatformAuth,
  validateJson,
  withApi,
} from "@sangam/api-kit";
import { Platform } from "@sangam/contracts";
import * as tenants from "@/server/platform/platform-tenants-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { id } = await params;
  const dto = await validateJson(
    req,
    Platform.UpdateTenantOperationalStatusSchema,
  );
  return tenants.updateOperationalStatus(
    parseUuidParam(id, "id"),
    dto.operationalStatus,
  );
});
