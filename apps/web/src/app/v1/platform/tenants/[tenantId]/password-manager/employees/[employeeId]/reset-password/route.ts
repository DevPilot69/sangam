import {
  identityFromRequest,
  parseUuidParam,
  rateLimit,
  requirePlatformAuth,
  withApi,
} from "@sangam/api-kit";
import * as passwordAdmin from "@/server/auth/password-admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string; employeeId: string }> };

export const POST = withApi(async (req, { params }: Ctx) => {
  const user = await requirePlatformAuth(req);
  await rateLimit({
    key: "platform-pm-emp-reset",
    limit: 30,
    windowMs: 60_000,
    identity: identityFromRequest(req, user.sub),
  });
  const { tenantId, employeeId } = await params;
  return passwordAdmin.resetPasswordByEmployeeId(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(employeeId, "employeeId"),
    null,
  );
});
