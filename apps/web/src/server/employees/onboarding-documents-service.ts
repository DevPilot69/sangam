import {
  prisma,
  type EmployeeOnboardingDocument,
  type EmployeeOnboardingDocumentType,
  EmployeeOnboardingDocumentType as EODT,
} from "@sangam/db";
import { BadRequestError, NotFoundError } from "@sangam/api-kit";
import { storage } from "@sangam/demo";

/**
 * Employee onboarding documents — same upload/download pattern as the
 * legal-documents service. Bytes routed through `@sangam/demo`'s storage
 * provider, downloads resolve to a sample PDF in demo mode.
 */

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png"]);
const MAX_BYTES = 15 * 1024 * 1024;

export type EmployeeOnboardingDocumentDto = {
  id: string;
  employeeId: string;
  documentType: EmployeeOnboardingDocumentType;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

function mapRow(
  row: EmployeeOnboardingDocument,
): EmployeeOnboardingDocumentDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    documentType: row.documentType,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
  };
}

async function assertEmployee(tenantId: string, employeeId: string) {
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!emp) throw new NotFoundError("Employee not found");
}

export async function listForEmployee(
  tenantId: string,
  employeeId: string,
): Promise<EmployeeOnboardingDocumentDto[]> {
  await assertEmployee(tenantId, employeeId);
  const rows = await prisma.employeeOnboardingDocument.findMany({
    where: { tenantId, employeeId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapRow);
}

export type UploadFileInput = {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  sizeBytes: number;
};

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i).toLowerCase();
}

export async function create(
  tenantId: string,
  employeeId: string,
  documentType: EmployeeOnboardingDocumentType,
  file: UploadFileInput | undefined,
): Promise<EmployeeOnboardingDocumentDto> {
  await assertEmployee(tenantId, employeeId);

  if (!file || !file.bytes || file.bytes.length === 0) {
    throw new BadRequestError("File is required");
  }
  if (file.sizeBytes > MAX_BYTES) {
    throw new BadRequestError("File too large (max 15 MB)");
  }
  if (!ALLOWED_MIMES.has(file.mimeType)) {
    throw new BadRequestError("Only PDF, JPEG, or PNG files are allowed");
  }
  const ext = extOf(file.fileName);
  if (!ALLOWED_EXT.has(ext)) {
    throw new BadRequestError("Invalid extension — use .pdf, .jpg, or .png");
  }

  const safeOriginal =
    file.fileName.replace(/[^\w.\-()+ ]/g, "_") || "document";

  const uploaded = await storage.upload({
    bytes: file.bytes,
    fileName: safeOriginal,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    tenantId,
    kind: "employee-docs",
    ownerRef: employeeId,
  });

  try {
    const row = await prisma.employeeOnboardingDocument.create({
      data: {
        tenantId,
        employeeId,
        documentType,
        originalFilename: safeOriginal.slice(0, 255),
        storedFilename: uploaded.id,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      },
    });
    return mapRow(row);
  } catch (e) {
    await storage.remove(uploaded.id).catch(() => undefined);
    throw e;
  }
}

export type DownloadResolution = {
  url: string;
  mimeType: string;
  fileName: string;
};

export async function resolveDownload(
  tenantId: string,
  employeeId: string,
  documentId: string,
): Promise<DownloadResolution> {
  const row = await prisma.employeeOnboardingDocument.findFirst({
    where: { id: documentId, tenantId, employeeId },
  });
  if (!row) throw new NotFoundError("Document not found");
  const meta = await storage.download(row.storedFilename);
  return {
    url: meta.url,
    mimeType: row.mimeType,
    fileName: row.originalFilename,
  };
}

export async function remove(
  tenantId: string,
  employeeId: string,
  documentId: string,
): Promise<void> {
  const row = await prisma.employeeOnboardingDocument.findFirst({
    where: { id: documentId, tenantId, employeeId },
  });
  if (!row) throw new NotFoundError("Document not found");
  await prisma.employeeOnboardingDocument.delete({
    where: { id: documentId },
  });
  await storage.remove(row.storedFilename).catch(() => undefined);
}

// ─── Onboarding doc-type helper ──────────────────────────────────────────────

const ONBOARDING_DOC_TYPES = new Set<string>(Object.values(EODT));

export function parseEmployeeOnboardingDocumentType(
  raw: unknown,
): EmployeeOnboardingDocumentType {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new BadRequestError("documentType is required");
  }
  if (!ONBOARDING_DOC_TYPES.has(raw)) {
    throw new BadRequestError(`Invalid documentType: ${raw}`);
  }
  return raw as EmployeeOnboardingDocumentType;
}
