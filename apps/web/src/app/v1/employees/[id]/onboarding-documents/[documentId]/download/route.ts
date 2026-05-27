import { NextResponse } from "next/server";
import {
  parseUuidParam,
  requireAuth,
  withApi,
} from "@sangam/api-kit";
import * as onboardingDocs from "@/server/employees/onboarding-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; documentId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["employees:read"]);
  const { id, documentId } = await params;
  const empId = parseUuidParam(id, "id");
  const docId = parseUuidParam(documentId, "documentId");
  const meta = await onboardingDocs.resolveDownload(
    user.tenantId,
    empId,
    docId,
  );

  return NextResponse.redirect(new URL(meta.url, req.url), {
    status: 302,
    headers: {
      "Content-Disposition": `attachment; filename="${encodeURIComponent(meta.fileName)}"`,
    },
  });
});
