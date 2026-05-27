import {
  parseUuidParam,
  requireAuth,
  withApi,
} from "@sangam/api-kit";
import * as legalDocs from "@/server/tenant/legal-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ documentId: string }> };

export const DELETE = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["settings:write"]);
  const { documentId } = await params;
  const docId = parseUuidParam(documentId, "documentId");
  await legalDocs.remove(user.tenantId, docId);
  return { deleted: true };
});
