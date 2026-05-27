import { validateJson, withApi } from "@sangam/api-kit";
import { Auth } from "@sangam/contracts";
import * as authService from "@/server/auth/auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApi(async (req) => {
  const dto = await validateJson(req, Auth.ForgotPasswordSchema);
  return authService.forgotPassword(dto);
});
