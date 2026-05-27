import { requirePlatformAuth, withApi } from "@sangam/api-kit";
import * as billing from "@/server/platform/platform-billing-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  await requirePlatformAuth(req);
  return billing.getOverview();
});
