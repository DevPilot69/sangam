import { requirePlatformAuth, withApi } from "@sangam/api-kit";
import * as telemetry from "@/server/platform/platform-telemetry-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  await requirePlatformAuth(req);
  return telemetry.getSummary();
});
