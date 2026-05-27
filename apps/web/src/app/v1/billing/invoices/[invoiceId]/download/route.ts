import { NextResponse } from "next/server";
import {
  parseUuidParam,
  requireAuth,
  withApi,
} from "@sangam/api-kit";
import * as billing from "@/server/billing/billing-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ invoiceId: string }> };

/**
 * Download a subscription invoice as standalone HTML (browsers can
 * print-to-PDF). The Nest version returned `text/html` with an
 * attachment disposition; we preserve that.
 *
 * The shape of the response intentionally bypasses the JSON envelope so
 * the front-end can stream it directly into a download anchor.
 */
export const GET = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["billing:read"]);
  const { invoiceId } = await params;
  const id = parseUuidParam(invoiceId, "invoiceId");
  const file = await billing.buildInvoiceDownloadPayload(user.tenantId, id);
  return new NextResponse(file.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
});
