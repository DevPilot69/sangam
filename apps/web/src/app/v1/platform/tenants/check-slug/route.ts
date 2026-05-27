import {
  requirePlatformAuth,
  validateQuery,
  withApi,
} from "@sangam/api-kit";
import { Platform } from "@sangam/contracts";
import * as tenants from "@/server/platform/platform-tenants-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  await requirePlatformAuth(req);
  const q = await validateQuery(req, Platform.SlugCheckQuerySchema);
  return tenants.isSlugAvailable(q.slug);
});
