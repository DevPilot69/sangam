import { BadRequestError, requireAuth, withApi } from "@sangam/api-kit";
import * as legalDocs from "@/server/tenant/legal-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req, ["settings:read"]);
  return legalDocs.list(user.tenantId);
});

export const POST = withApi(async (req) => {
  const user = await requireAuth(req, ["settings:write"]);

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
    user.tenantId,
    legalDocs.parseLegalDocumentType(documentTypeRaw),
    file,
  );
});
