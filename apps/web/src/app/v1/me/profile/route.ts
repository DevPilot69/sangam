import { validateJson, withApi } from "@sangam/api-kit";
import { EmployeePortal } from "@sangam/contracts";
import { getLinkedEmployee } from "@/server/employee-portal/linked-employee";
import * as portal from "@/server/employee-portal/portal-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const emp = await getLinkedEmployee(req);
  return portal.getProfile(emp);
});

export const PATCH = withApi(async (req) => {
  const emp = await getLinkedEmployee(req);
  const dto = await validateJson(req, EmployeePortal.PatchMeProfileSchema);
  return portal.patchProfile(emp, dto);
});
