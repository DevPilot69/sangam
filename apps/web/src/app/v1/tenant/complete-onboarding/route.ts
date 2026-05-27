import { requireAuth, withApi } from "@sangam/api-kit";
import * as tenantService from "@/server/tenant/tenant-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApi(async (req) => {
  const user = await requireAuth(req, ["settings:write"]);
  return tenantService.completeOnboarding(user.tenantId);
});
