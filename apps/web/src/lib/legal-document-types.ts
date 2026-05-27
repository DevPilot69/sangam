/** Mirrors API `TenantLegalDocumentType`. */
export type TenantLegalDocumentType =
  | "CERTIFICATE_OF_INCORPORATION"
  | "MEMORANDUM_ARTICLES"
  | "GST_REGISTRATION"
  | "PAN_ENTITY"
  | "SHOPS_AND_ESTABLISHMENTS"
  | "MSME_UDYAM"
  | "LABOUR_LICENSE"
  | "OTHER";

export const TENANT_LEGAL_DOCUMENT_OPTIONS: { value: TenantLegalDocumentType; label: string }[] = [
  { value: "CERTIFICATE_OF_INCORPORATION", label: "Certificate of incorporation" },
  { value: "MEMORANDUM_ARTICLES", label: "Memorandum & articles of association" },
  { value: "GST_REGISTRATION", label: "GST registration certificate" },
  { value: "PAN_ENTITY", label: "PAN (entity)" },
  { value: "SHOPS_AND_ESTABLISHMENTS", label: "Shops & establishments registration" },
  { value: "MSME_UDYAM", label: "MSME / Udyam registration" },
  { value: "LABOUR_LICENSE", label: "Labour license / Shop license" },
  { value: "OTHER", label: "Other legal document" },
];

export function labelForLegalDocumentType(t: string): string {
  return TENANT_LEGAL_DOCUMENT_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

export type TenantLegalDocumentRow = {
  id: string;
  documentType: TenantLegalDocumentType | string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
