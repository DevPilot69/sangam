import { prisma, type TenantLegalDocument, type TenantLegalDocumentType } from "@sangam/db";
import { BadRequestError, NotFoundError } from "@sangam/api-kit";
import { storage } from "@sangam/demo";

/**
 * Tenant legal documents — ported from
 *   src/modules/tenant/tenant-legal-documents.service.ts
 *
 * Differences from the original:
 *   - File bytes are routed through `@sangam/demo`'s storage provider. In demo
 *     mode bytes are dropped and `/samples/sample-legal-document.pdf` is
 *     served on download. In production the provider points at S3/Blob.
 *   - We store the storage provider's upload id in `storedFilename` so the
 *     existing column doesn't have to migrate. (Phase 6 will refactor to a
 *     dedicated storageRef column.)
 *   - Download returns a JSON envelope `{ url, mimeType, fileName }`; the
 *     frontend redirects to that URL. (Old controller streamed bytes from
 *     local disk — not possible on Vercel anyway.)
 */

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

const MAX_BYTES = 15 * 1024 * 1024;

export type TenantLegalDocumentDto = {
  id: string;
  tenantId: string;
  documentType: TenantLegalDocumentType;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

function mapRow(row: TenantLegalDocument): TenantLegalDocumentDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    documentType: row.documentType,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
  };
}

async function assertTenantExists(tenantId: string): Promise<void> {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!t) throw new NotFoundError("Tenant not found");
}

export async function list(
  tenantId: string,
): Promise<TenantLegalDocumentDto[]> {
  await assertTenantExists(tenantId);
  const rows = await prisma.tenantLegalDocument.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapRow);
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i).toLowerCase();
}

export type UploadFileInput = {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  sizeBytes: number;
};

export async function create(
  tenantId: string,
  documentType: TenantLegalDocumentType,
  file: UploadFileInput | undefined,
): Promise<TenantLegalDocumentDto> {
  await assertTenantExists(tenantId);
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
    kind: "tenant-legal-docs",
    ownerRef: tenantId,
  });

  try {
    const row = await prisma.tenantLegalDocument.create({
      data: {
        tenantId,
        documentType,
        originalFilename: safeOriginal.slice(0, 255),
        storedFilename: uploaded.id, // stash storage id in the existing column
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
  documentId: string,
): Promise<DownloadResolution> {
  const row = await prisma.tenantLegalDocument.findFirst({
    where: { id: documentId, tenantId },
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
  documentId: string,
): Promise<void> {
  const row = await prisma.tenantLegalDocument.findFirst({
    where: { id: documentId, tenantId },
  });
  if (!row) throw new NotFoundError("Document not found");
  await prisma.tenantLegalDocument.delete({ where: { id: documentId } });
  await storage.remove(row.storedFilename).catch(() => undefined);
}

// ─── Legal-document-type helper ──────────────────────────────────────────────

import { TenantLegalDocumentType as LDT } from "@sangam/db";

const LEGAL_DOC_TYPES = new Set<string>(Object.values(LDT));

export function parseLegalDocumentType(raw: unknown): TenantLegalDocumentType {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new BadRequestError("documentType is required");
  }
  if (!LEGAL_DOC_TYPES.has(raw)) {
    throw new BadRequestError(`Invalid documentType: ${raw}`);
  }
  return raw as TenantLegalDocumentType;
}
