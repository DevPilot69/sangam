import {
  parseUuidParam,
  requirePlatformAuth,
  withApi,
} from "@sangam/api-kit";
import * as onboardingDocs from "@/server/employees/onboarding-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string; employeeId: string; documentId: string }> };

export const DELETE = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, employeeId, documentId } = await params;
  await onboardingDocs.remove(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(employeeId, "employeeId"),
    parseUuidParam(documentId, "documentId"),
  );
  return { deleted: true };
});
