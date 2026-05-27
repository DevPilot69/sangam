import { prisma } from "@sangam/db";
import { isDemoMode } from "./demo-mode";

/**
 * Storage provider — pluggable. In demo mode, file BYTES are discarded; only
 * the metadata + a synthetic URL are persisted (in `MockUpload`). Downloads
 * resolve to a sample PDF served from `apps/web/public/samples/`.
 *
 * This decouples upload routes from the real S3 / Vercel Blob client. Phase 6
 * swaps `mockProvider` for an S3/Blob implementation with the same surface.
 *
 * Why throw away the bytes? Vercel serverless functions have a read-only
 * filesystem outside /tmp, and /tmp is per-invocation. So we cannot persist
 * uploaded bytes locally. Real persistence requires S3/Blob anyway, and
 * giving the demo a "good enough" download path keeps the workflow demoable.
 */

export type UploadInput = {
  /** The bytes of the uploaded file. Discarded in demo mode. */
  bytes: Buffer | Uint8Array;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  tenantId?: string;
  /** Bucket / logical folder: "tenant-legal-docs", "employee-docs", etc. */
  kind: string;
  /** Owner reference: employeeId, slug, etc. */
  ownerRef?: string;
  uploadedBy?: string;
};

export type UploadResult = {
  id: string;
  url: string;
  storage: "mock" | "s3" | "blob";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;
  download(id: string): Promise<{ url: string; mimeType: string; fileName: string }>;
  remove(id: string): Promise<void>;
}

/** Sample-file routing: which canned PDF/image to serve for each kind. */
function sampleUrlFor(kind: string, mimeType: string): string {
  if (mimeType.startsWith("image/")) return "/samples/sample-image.png";
  switch (kind) {
    case "tenant-legal-docs":
      return "/samples/sample-legal-document.pdf";
    case "employee-docs":
      return "/samples/sample-employee-document.pdf";
    case "payslips":
      return "/samples/sample-payslip.pdf";
    case "invoices":
      return "/samples/sample-invoice.pdf";
    default:
      return "/samples/sample-document.pdf";
  }
}

const mockProvider: StorageProvider = {
  async upload(input) {
    const url = sampleUrlFor(input.kind, input.mimeType);
    const row = await prisma.mockUpload.create({
      data: {
        tenantId: input.tenantId ?? null,
        kind: input.kind,
        ownerRef: input.ownerRef ?? null,
        fileName: input.fileName.slice(0, 255),
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storage: "mock",
        url,
        uploadedBy: input.uploadedBy ?? null,
      },
    });
    return {
      id: row.id,
      url: row.url,
      storage: "mock",
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
    };
  },

  async download(id) {
    const row = await prisma.mockUpload.findUnique({ where: { id } });
    if (!row) throw new Error("Upload not found");
    return { url: row.url, mimeType: row.mimeType, fileName: row.fileName };
  },

  async remove(id) {
    await prisma.mockUpload.delete({ where: { id } }).catch(() => undefined);
  },
};

const realProvider: StorageProvider = {
  async upload() {
    throw new Error(
      "Real storage provider not wired yet. Set DEMO_MODE=true or implement the S3/Blob client.",
    );
  },
  async download() {
    throw new Error("Real storage provider not wired yet.");
  },
  async remove() {
    throw new Error("Real storage provider not wired yet.");
  },
};

export const storage: StorageProvider = isDemoMode() ? mockProvider : realProvider;
