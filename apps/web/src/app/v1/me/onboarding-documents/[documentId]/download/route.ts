import { NextResponse } from "next/server";
import { parseUuidParam, withApi } from "@sangam/api-kit";
import { getLinkedEmployee } from "@/server/employee-portal/linked-employee";
import * as onboardingDocs from "@/server/employees/onboarding-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ documentId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  const emp = await getLinkedEmployee(req);
  const { documentId } = await params;
  const docId = parseUuidParam(documentId, "documentId");
  const meta = await onboardingDocs.resolveDownload(emp.tenantId, emp.id, docId);
  return NextResponse.redirect(new URL(meta.url, req.url), {
    status: 302,
    headers: {
      "Content-Disposition": `attachment; filename="${encodeURIComponent(meta.fileName)}"`,
    },
  });
});
