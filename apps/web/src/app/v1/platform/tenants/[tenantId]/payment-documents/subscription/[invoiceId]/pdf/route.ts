import { NextResponse } from "next/server";
import {
  parseUuidParam,
  requirePlatformAuth,
  withApi,
} from "@sangam/api-kit";
import * as financialDocs from "@/server/billing/financial-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string; invoiceId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, invoiceId } = await params;
  const { url, filename } = await financialDocs.resolveSubscriptionPdf(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(invoiceId, "invoiceId"),
  );
  return NextResponse.redirect(new URL(url, req.url), {
    status: 302,
    headers: {
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
});
