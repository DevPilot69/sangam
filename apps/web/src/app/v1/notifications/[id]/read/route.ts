import { parseUuidParam, requireAuth, withApi } from "@sangam/api-kit";
import * as notifications from "@/server/notifications/notifications-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req);
  const { id } = await params;
  return notifications.markRead(
    user.sub,
    user.tenantId,
    parseUuidParam(id, "id"),
  );
});
