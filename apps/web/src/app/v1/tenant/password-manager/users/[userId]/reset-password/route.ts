import {
  parseUuidParam,
  requireAuth,
  withApi,
} from "@sangam/api-kit";
import * as passwordAdmin from "@/server/auth/password-admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ userId: string }> };

export const POST = withApi(async (req, { params }: Ctx) => {
  const actor = await requireAuth(req, ["settings:write"]);
  const { userId } = await params;
  const uid = parseUuidParam(userId, "userId");
  return passwordAdmin.resetPasswordByUserId(actor.tenantId, uid, {
    actorUserId: actor.sub,
    allowTenantAdminTargets: false,
    forbidSelf: true,
  });
});
