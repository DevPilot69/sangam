import { NextResponse } from "next/server";
import {
  parseUuidParam,
  requireAuth,
  withApi,
} from "@sangam/api-kit";
import * as legalDocs from "@/server/tenant/legal-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ documentId: string }> };

/**
 * Download a legal document.
 *
 * Returns a 302 redirect to either the demo sample PDF
 * (`/samples/sample-legal-document.pdf`) or — once Phase 6 wires S3/Blob —
 * a presigned URL. The frontend's existing
 * `lib/api/tenant-legal-documents.ts` already calls this via
 * `window.location.href`, so redirects are sufficient.
 */
export const GET = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["settings:read"]);
  const { documentId } = await params;
  const docId = parseUuidParam(documentId, "documentId");
  const meta = await legalDocs.resolveDownload(user.tenantId, docId);

  return NextResponse.redirect(new URL(meta.url, req.url), {
    status: 302,
    headers: {
      "Content-Disposition": `attachment; filename="${encodeURIComponent(meta.fileName)}"`,
    },
  });
});
