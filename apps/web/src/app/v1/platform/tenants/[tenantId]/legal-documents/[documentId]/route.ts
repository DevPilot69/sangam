import {
  parseUuidParam,
  requirePlatformAuth,
  withApi,
} from "@sangam/api-kit";
import * as legalDocs from "@/server/tenant/legal-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string; documentId: string }> };

export const DELETE = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, documentId } = await params;
  await legalDocs.remove(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(documentId, "documentId"),
  );
  return { deleted: true };
});
