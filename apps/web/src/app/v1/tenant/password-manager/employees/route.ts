import { requireAuth, withApi } from "@sangam/api-kit";
import * as passwordAdmin from "@/server/auth/password-admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["settings:write"]);
  return passwordAdmin.listEmployeesForTenant(user.tenantId);
});
