import {
  parseUuidParam,
  requireAuth,
  validateJson,
  withApi,
} from "@sangam/api-kit";
import { Leave } from "@sangam/contracts";
import * as leave from "@/server/leave/leave-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["leave:approve"]);
  const { id } = await params;
  const requestId = parseUuidParam(id, "id");
  const dto = await validateJson(req, Leave.PatchLeaveStatusSchema);
  return leave.updateRequestStatus(user.tenantId, requestId, dto.status);
});
