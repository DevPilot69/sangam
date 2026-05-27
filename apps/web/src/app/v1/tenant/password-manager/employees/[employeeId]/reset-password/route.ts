import {
  parseUuidParam,
  requireAuth,
  withApi,
} from "@sangam/api-kit";
import * as passwordAdmin from "@/server/auth/password-admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ employeeId: string }> };

export const POST = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["settings:write"]);
  const { employeeId } = await params;
  const empId = parseUuidParam(employeeId, "employeeId");
  return passwordAdmin.resetPasswordByEmployeeId(
    user.tenantId,
    empId,
    user.sub,
  );
});
