import { requireAuth, validateQuery, withApi } from "@sangam/api-kit";
import { Notifications } from "@sangam/contracts";
import * as notifications from "@/server/notifications/notifications-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req);
  const q = await validateQuery(req, Notifications.ListNotificationsQuerySchema);
  return notifications.list(user.sub, user.tenantId, q.limit ?? 30);
});
