import { biometric, isDemoMode } from "@sangam/demo";
import { UnauthorizedError, withApi } from "@sangam/api-kit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Vercel Cron entrypoint — seeds today's biometric attendance for every
 * tenant. Wired in `vercel.json` under `crons[]`.
 *
 * Auth:
 *  - Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` if the env
 *    variable is set, so we accept that or fall back to checking the
 *    `x-vercel-cron` header that Vercel injects on cron-triggered requests.
 *  - In DEMO_MODE we relax to allow unauthenticated triggers from localhost
 *    so the dev loop is friction-free.
 */
function isAuthorisedCron(req: Request): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth === `Bearer ${secret}`) return true;
  }
  return false;
}

export const GET = withApi(async (req) => {
  if (!isDemoMode()) {
    return {
      skipped: true,
      reason: "DEMO_MODE=false — real biometric webhook owns this surface",
    };
  }
  if (!isAuthorisedCron(req)) {
    throw new UnauthorizedError("Cron credentials required");
  }
  const results = await biometric.seedAllTenantsToday();
  return {
    seededTenants: results.length,
    totalCreated: results.reduce((s, r) => s + r.created, 0),
    totalSkipped: results.reduce((s, r) => s + r.skipped, 0),
    results,
  };
});
