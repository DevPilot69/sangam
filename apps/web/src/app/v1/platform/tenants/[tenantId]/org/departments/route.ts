import {
  parseUuidParam,
  requirePlatformAuth,
  validateJson,
  withApi,
} from "@sangam/api-kit";
import { Tenant } from "@sangam/contracts";
import * as departments from "@/server/tenant/departments-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;
  return departments.list(parseUuidParam(tenantId, "tenantId"));
});

export const POST = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;
  const dto = await validateJson(req, Tenant.CreateDepartmentSchema);
  return departments.create(parseUuidParam(tenantId, "tenantId"), dto);
});
