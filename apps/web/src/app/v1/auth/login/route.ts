import { cookies } from "next/headers";
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  validateJson,
  withApi,
} from "@sangam/api-kit";
import { Auth } from "@sangam/contracts";
import * as authService from "@/server/auth/auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApi(async (req) => {
  const dto = await validateJson(req, Auth.LoginSchema);
  const cookieStore = await cookies();

  return authService.login(dto, {
    setCookie: (name, value, maxAgeMs) => {
      cookieStore.set(name, value, refreshCookieOptions(maxAgeMs));
    },
  });
});

// Tiny self-doc: this is the only place that needs the cookie store. The
// frontend's `apiFetchJson` calls `/v1/auth/refresh` automatically on 401,
// which uses the same setter pattern from refresh/route.ts.
export { REFRESH_COOKIE_NAME };
