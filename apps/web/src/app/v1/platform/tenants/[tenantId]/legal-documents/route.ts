import {
  BadRequestError,
  parseUuidParam,
  requirePlatformAuth,
  withApi,
} from "@sangam/api-kit";
import * as legalDocs from "@/server/tenant/legal-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;
  return legalDocs.list(parseUuidParam(tenantId, "tenantId"));
});

export const POST = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId } = await params;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new BadRequestError("multipart/form-data body expected");
  }
  const documentTypeRaw = form.get("documentType");
  const fileField = form.get("file");
  if (!(fileField instanceof Blob)) {
    throw new BadRequestError("File is required");
  }
  const bytes = Buffer.from(await fileField.arrayBuffer());
  const file = {
    fileName: (fileField as File).name ?? "document",
    mimeType: fileField.type ?? "application/octet-stream",
    bytes,
    sizeBytes: bytes.length,
  };

  return legalDocs.create(
    parseUuidParam(tenantId, "tenantId"),
    legalDocs.parseLegalDocumentType(documentTypeRaw),
    file,
  );
});
