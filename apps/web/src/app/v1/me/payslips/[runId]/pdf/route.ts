import { NextResponse } from "next/server";
import { parseUuidParam, withApi } from "@sangam/api-kit";
import { getLinkedEmployee } from "@/server/employee-portal/linked-employee";
import * as portal from "@/server/employee-portal/portal-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ runId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  const emp = await getLinkedEmployee(req);
  const { runId } = await params;
  const { url, filename } = await portal.resolvePayslipPdf(
    emp,
    parseUuidParam(runId, "runId"),
  );
  return NextResponse.redirect(new URL(url, req.url), {
    status: 302,
    headers: {
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
});
