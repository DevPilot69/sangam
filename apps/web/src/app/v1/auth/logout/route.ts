import { cookies } from "next/headers";
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  withApi,
} from "@sangam/api-kit";
import * as authService from "@/server/auth/auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApi(async () => {
  const cookieStore = await cookies();
  const existing = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  await authService.logout(existing);
  // Clear by setting an immediate-expiry cookie of the same name/path/flags.
  cookieStore.set(REFRESH_COOKIE_NAME, "", refreshCookieOptions(0));
  return { ok: true };
});
