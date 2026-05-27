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

type Ctx = { params: Promise<{ tenantId: string; userId: string }> };

export const POST = withApi(async (req, { params }: Ctx) => {
  const user = await requirePlatformAuth(req);
  await rateLimit({
    key: "platform-pm-reset",
    limit: 30,
    windowMs: 60_000,
    identity: identityFromRequest(req, user.sub),
  });
  const { tenantId, userId } = await params;
  return passwordAdmin.resetPasswordByUserId(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(userId, "userId"),
    { actorUserId: null, allowTenantAdminTargets: true },
  );
});
