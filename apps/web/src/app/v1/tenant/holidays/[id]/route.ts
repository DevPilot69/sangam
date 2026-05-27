import {
  parseUuidParam,
  requireAuth,
  validateJson,
  withApi,
} from "@sangam/api-kit";
import { Tenant } from "@sangam/contracts";
import * as holidaysService from "@/server/tenant/holidays-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["settings:write"]);
  const { id } = await params;
  const holId = parseUuidParam(id, "id");
  const dto = await validateJson(req, Tenant.UpdateHolidaySchema);
  return holidaysService.update(user.tenantId, holId, dto);
});

export const DELETE = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["settings:write"]);
  const { id } = await params;
  const holId = parseUuidParam(id, "id");
  return holidaysService.remove(user.tenantId, holId);
});
