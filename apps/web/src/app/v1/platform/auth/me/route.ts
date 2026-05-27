import { requirePlatformAuth, withApi } from "@sangam/api-kit";
import * as platformAuth from "@/server/platform/platform-auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requirePlatformAuth(req);
  return platformAuth.me(user.sub);
});
