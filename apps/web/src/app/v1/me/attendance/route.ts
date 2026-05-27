import { validateQuery, withApi } from "@sangam/api-kit";
import { EmployeePortal } from "@sangam/contracts";
import { getLinkedEmployee } from "@/server/employee-portal/linked-employee";
import * as portal from "@/server/employee-portal/portal-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const emp = await getLinkedEmployee(req);
  const q = await validateQuery(req, EmployeePortal.MeAttendanceQuerySchema);
  return portal.listAttendance(emp, q);
});
