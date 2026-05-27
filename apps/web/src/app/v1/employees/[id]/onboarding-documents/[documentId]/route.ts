import {
  parseUuidParam,
  requireAuth,
  withApi,
} from "@sangam/api-kit";
import * as onboardingDocs from "@/server/employees/onboarding-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; documentId: string }> };

export const DELETE = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["employees:write"]);
  const { id, documentId } = await params;
  const empId = parseUuidParam(id, "id");
  const docId = parseUuidParam(documentId, "documentId");
  await onboardingDocs.remove(user.tenantId, empId, docId);
  return { deleted: true };
});
