import {
  BadRequestError,
  parseUuidParam,
  requirePlatformAuth,
  withApi,
} from "@sangam/api-kit";
import * as onboardingDocs from "@/server/employees/onboarding-documents-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantId: string; employeeId: string }> };

export const GET = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, employeeId } = await params;
  return onboardingDocs.listForEmployee(
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(employeeId, "employeeId"),
  );
});

export const POST = withApi(async (req, { params }: Ctx) => {
  await requirePlatformAuth(req);
  const { tenantId, employeeId } = await params;

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
    parseUuidParam(tenantId, "tenantId"),
    parseUuidParam(employeeId, "employeeId"),
    onboardingDocs.parseEmployeeOnboardingDocumentType(documentTypeRaw),
    file,
  );
});
