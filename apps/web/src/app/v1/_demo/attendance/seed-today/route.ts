import { requireAuth, withApi } from "@sangam/api-kit";
import { biometric } from "@sangam/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Manual trigger for the biometric attendance seeder — drives the
 * "Simulate today" admin button on the Attendance screen.
 *
 * Permission `attendance:write` keeps this gated to HR managers / admins
 * (mirrors the original NestJS RBAC grant). The actual seeder throws if
 * DEMO_MODE is off so prod can't accidentally synthesise data.
 */
export const POST = withApi(async (req) => {
  const user = await requireAuth(req, ["attendance:write"]);
  return biometric.seedToday(user.tenantId);
});
