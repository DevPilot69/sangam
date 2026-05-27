import { requireAuth, validateQuery, withApi } from "@sangam/api-kit";
import { Attendance } from "@sangam/contracts";
import * as attendance from "@/server/attendance/attendance-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["attendance:read"]);
  const query = await validateQuery(req, Attendance.AttendanceQuerySchema);
  return attendance.summary(user.tenantId, query);
});
