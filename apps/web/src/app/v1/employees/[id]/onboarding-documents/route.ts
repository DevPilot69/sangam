import {
  BadRequestError,
  parseUuidParam,
  requireAuth,
  withApi,
} from "@sangam/api-kit";
import * as onboardingDocs from "@/server/employees/onboarding-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["employees:read"]);
  const { id } = await params;
  const empId = parseUuidParam(id, "id");
  return onboardingDocs.listForEmployee(user.tenantId, empId);
});

export const POST = withApi(async (req, { params }: Ctx) => {
  const user = await requireAuth(req, ["employees:write"]);
  const { id } = await params;
  const empId = parseUuidParam(id, "id");

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

  return onboardingDocs.create(
    user.tenantId,
    empId,
    onboardingDocs.parseEmployeeOnboardingDocumentType(documentTypeRaw),
    file,
  );
});
