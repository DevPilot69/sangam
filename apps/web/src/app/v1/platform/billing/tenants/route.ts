import {
  requirePlatformAuth,
  validateQuery,
  withApi,
} from "@sangam/api-kit";
import { Platform } from "@sangam/contracts";
import * as billing from "@/server/platform/platform-billing-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  await requirePlatformAuth(req);
  const q = await validateQuery(req, Platform.BillingListQuerySchema);
  return billing.listTenants(q);
});
