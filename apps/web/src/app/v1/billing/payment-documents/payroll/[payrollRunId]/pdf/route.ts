import { NextResponse } from "next/server";
import {
  parseUuidParam,
  requireAuth,
  withApi,
} from "@sangam/api-kit";
import * as financialDocs from "@/server/billing/financial-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ payrollRunId: string }> };

/**
 * Download a payroll-run PDF (consolidated disbursement document).
 *
 * In demo mode redirects to `/samples/sample-payslip.pdf`. The route
 * itself is invoice-eligibility-gated by the service layer (APPROVED /
 * LOCKED / DISBURSED only).
 */
export const GET = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["billing:read"]);
  const { payrollRunId } = await params;
  const id = parseUuidParam(payrollRunId, "payrollRunId");
  const { url, filename } = await financialDocs.resolvePayrollPdf(
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
