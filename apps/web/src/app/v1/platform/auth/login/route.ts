import { validateJson, withApi } from "@sangam/api-kit";
import { Platform } from "@sangam/contracts";
import * as platformAuth from "@/server/platform/platform-auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApi(async (req) => {
  const dto = await validateJson(req, Platform.PlatformLoginSchema);
  return platformAuth.login(dto.email, dto.password);
});
