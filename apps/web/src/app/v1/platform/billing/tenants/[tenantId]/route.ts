import {
  parseUuidParam,
  requirePlatformAuth,
  validateJson,
  withApi,
} from "@sangam/api-kit";
import { Platform } from "@sangam/contracts";
import * as billing from "@/server/platform/platform-billing-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;
  return billing.getTenantBilling(parseUuidParam(tenantId, "tenantId"));
});

export const PATCH = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;
  const dto = await validateJson(req, Platform.PatchBillingOpsSchema);
  return billing.updateTenantBilling(parseUuidParam(tenantId, "tenantId"), dto);
});
