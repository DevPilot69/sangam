import { NextResponse } from "next/server";
import {
  parseUuidParam,
  requireAuth,
  withApi,
} from "@sangam/api-kit";
import * as financialDocs from "@/server/billing/financial-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ invoiceId: string }> };

/**
 * Download a subscription invoice PDF.
 *
 * In demo mode this redirects to `/samples/sample-invoice.pdf`. Phase 6
 * swaps the resolver for a real pdfkit/puppeteer/r2-presigned-url flow,
 * keeping this route handler unchanged.
 */
export const GET = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["billing:read"]);
  const { invoiceId } = await params;
  const id = parseUuidParam(invoiceId, "invoiceId");
  const { url, filename } = await financialDocs.resolveSubscriptionPdf(
    user.tenantId,
    id,
  );
  return NextResponse.redirect(new URL(url, req.url), {
    status: 302,
    headers: {
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
});
