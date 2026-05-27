"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import {
  deletePlatformTenantLegalDocument,
  deleteTenantLegalDocument,
  downloadPlatformTenantLegalDocument,
  downloadTenantLegalDocument,
  uploadPlatformTenantLegalDocument,
  uploadTenantLegalDocument,
} from "@/lib/api/tenant-legal-documents";
import {
  formatFileSize,
  labelForLegalDocumentType,
  TENANT_LEGAL_DOCUMENT_OPTIONS,
  type TenantLegalDocumentRow,
  type TenantLegalDocumentType,
} from "@/lib/legal-document-types";

type Props = {
  mode: "platform" | "tenant";
  tenantId?: string;
  documents: TenantLegalDocumentRow[];
  canManage: boolean;
  token: string | null;
  queryKeyToInvalidate: unknown[];
};

export function TenantLegalDocumentsManager({
  mode,
  tenantId,
  documents,
  canManage,
  token,
  queryKeyToInvalidate,
}: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<TenantLegalDocumentType>("CERTIFICATE_OF_INCORPORATION");

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      if (!token) throw new Error("Not signed in");
      if (mode === "platform") {
        if (!tenantId) throw new Error("Missing tenant");
        return uploadPlatformTenantLegalDocument(token, tenantId, file, docType);
      }
      return uploadTenantLegalDocument(token, file, docType);
    },
    onSuccess: () => {
      toast.success("Document uploaded");
      void qc.invalidateQueries({ queryKey: queryKeyToInvalidate });
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else if (e instanceof Error) toast.error(e.message);
      else toast.error("Upload failed");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (documentId: string) => {
      if (!token) throw new Error("Not signed in");
      if (mode === "platform") {
        if (!tenantId) throw new Error("Missing tenant");
        return deletePlatformTenantLegalDocument(token, tenantId, documentId);
      }
      return deleteTenantLegalDocument(token, documentId);
    },
    onSuccess: () => {
      toast.success("Document removed");
      void qc.invalidateQueries({ queryKey: queryKeyToInvalidate });
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Could not delete");
    },
  });

  async function onDownload(row: TenantLegalDocumentRow) {
    if (!token) return;
    try {
      if (mode === "platform") {
        if (!tenantId) return;
        await downloadPlatformTenantLegalDocument(
          token,
          tenantId,
          row.id,
          row.originalFilename
        );
      } else {
        await downloadTenantLegalDocument(token, row.id, row.originalFilename);
      }
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Download failed");
    }
  }

  return (
    <GlassCard level={2}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Legal & compliance documents
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Store incorporation, GST, PAN, and other statutory documents for this organization. PDF
            or images up to 15 MB.
          </p>
        </div>
      </div>

      {canManage ? (
        <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="legal-doc-type">Document type</Label>
            <select
              id="legal-doc-type"
              className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={docType}
              onChange={(e) => setDocType(e.target.value as TenantLegalDocumentType)}
            >
              {TENANT_LEGAL_DOCUMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMut.mutate(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={uploadMut.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {uploadMut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload document
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        {!documents.length ? (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">File</th>
                <th className="pb-2 pr-4 font-medium">Size</th>
                <th className="pb-2 pr-4 font-medium">Uploaded</th>
                <th className="pb-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="py-3 pr-4 align-top">
                    <span className="font-medium">{labelForLegalDocumentType(row.documentType)}</span>
                  </td>
                  <td className="py-3 pr-4 align-top font-mono text-xs">{row.originalFilename}</td>
                  <td className="py-3 pr-4 align-top text-muted-foreground">
                    {formatFileSize(row.sizeBytes)}
                  </td>
                  <td className="py-3 pr-4 align-top text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 align-top text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        title="Download"
                        onClick={() => void onDownload(row)}
                      >
                        <Download className="size-4" />
                      </Button>
                      {canManage ? (
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="text-[var(--danger-text)]"
                          title="Delete"
                          disabled={deleteMut.isPending}
                          onClick={() => {
                            if (confirm(`Delete ${row.originalFilename}?`)) deleteMut.mutate(row.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </GlassCard>
  );
}
