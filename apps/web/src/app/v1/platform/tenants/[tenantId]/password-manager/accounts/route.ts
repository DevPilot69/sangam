import {
  parseUuidParam,
  requirePlatformAuth,
  withApi,
} from "@sangam/api-kit";
import * as passwordAdmin from "@/server/auth/password-admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;
  const type = new URL(req.url).searchParams.get("type");
  const filter =
    type === "tenant_admin" || type === "employee" ? type : "all";
  return passwordAdmin.listForPlatform(
    parseUuidParam(tenantId, "tenantId"),
    filter,
  );
});
