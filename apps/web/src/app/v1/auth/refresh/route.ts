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

  return authService.refresh(existing, {
    setCookie: (name, value, maxAgeMs) => {
      cookieStore.set(name, value, refreshCookieOptions(maxAgeMs));
    },
  });
});
