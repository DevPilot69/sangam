import { withApi } from "@sangam/api-kit";
import { getLinkedEmployee } from "@/server/employee-portal/linked-employee";
import * as onboardingDocs from "@/server/employees/onboarding-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const emp = await getLinkedEmployee(req);
  return onboardingDocs.listForEmployee(emp.tenantId, emp.id);
});
