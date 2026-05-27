import { NextResponse } from "next/server";
import {
  parseUuidParam,
  requirePlatformAuth,
  withApi,
} from "@sangam/api-kit";
import * as legalDocs from "@/server/tenant/legal-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string; documentId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, documentId } = await params;
  const meta = await legalDocs.resolveDownload(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(documentId, "documentId"),
  );
  return NextResponse.redirect(new URL(meta.url, req.url), {
    status: 302,
    headers: {
      "Content-Disposition": `attachment; filename="${encodeURIComponent(meta.fileName)}"`,
    },
  });
});
