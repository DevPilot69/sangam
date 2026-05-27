import { NextResponse } from "next/server";
import {
  parseUuidParam,
  requirePlatformAuth,
  withApi,
} from "@sangam/api-kit";
import * as onboardingDocs from "@/server/employees/onboarding-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string; employeeId: string; documentId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, employeeId, documentId } = await params;
  const meta = await onboardingDocs.resolveDownload(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(employeeId, "employeeId"),
    parseUuidParam(documentId, "documentId"),
  );
  return NextResponse.redirect(new URL(meta.url, req.url), {
    status: 302,
    headers: {
      "Content-Disposition": `attachment; filename="${encodeURIComponent(meta.fileName)}"`,
    },
  });
});
