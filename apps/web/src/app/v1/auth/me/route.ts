import { requireAuth, withApi } from "@sangam/api-kit";
import * as authService from "@/server/auth/auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req);
  return authService.me(user.sub);
});
