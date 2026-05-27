import { requireAuth, withApi } from "@sangam/api-kit";
import * as attendance from "@/server/attendance/attendance-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  await requireAuth(req, ["attendance:read"]);
  return attendance.getMonthOptions();
});
