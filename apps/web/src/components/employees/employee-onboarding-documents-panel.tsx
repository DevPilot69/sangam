"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EMPLOYEE_ONBOARDING_DOCUMENT_OPTIONS,
  labelForEmployeeOnboardingDocumentType,
  type EmployeeOnboardingDocumentRow,
  type EmployeeOnboardingDocumentType,
} from "@/lib/api/employee-onboarding-documents";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils/formatters";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export type OnboardingDocumentsApi = {
  queryKey: (string | undefined)[];
  fetch: () => Promise<EmployeeOnboardingDocumentRow[]>;
  upload: (file: File, documentType: EmployeeOnboardingDocumentType) => Promise<unknown>;
  download: (documentId: string, filename: string) => Promise<void>;
  remove: (documentId: string) => Promise<unknown>;
};

type EmployeeOnboardingDocumentsPanelProps = {
  canWrite: boolean;
  api: OnboardingDocumentsApi;
};

export function EmployeeOnboardingDocumentsPanel({
  canWrite,
  api,
}: EmployeeOnboardingDocumentsPanelProps) {
  const qc = useQueryClient();
  const [documentType, setDocumentType] = useState<EmployeeOnboardingDocumentType>("PAN_CARD");
  const [file, setFile] = useState<File | null>(null);

  const docsQuery = useQuery({
    queryKey: api.queryKey,
    queryFn: () => api.fetch(),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: api.queryKey });
    void qc.invalidateQueries({ queryKey: ["me", "onboarding-documents"] });
    void qc.invalidateQueries({ queryKey: ["employee"] });
  };

  const uploadMut = useMutation({
    mutationFn: () => api.upload(file!, documentType),
    onSuccess: () => {
      toast.success("Document uploaded");
      setFile(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Upload failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (documentId: string) => api.remove(documentId),
    onSuccess: () => {
      toast.success("Document removed");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Remove failed"),
  });

  return (
    <div className="space-y-4">
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">
          Onboarding documents are stored for this employee and appear in their self-service
          Document center, regardless of whether they were uploaded here or from the tenant admin
          portal.
        </p>
        {canWrite ? (
          <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="onb-type">Document type</Label>
              <select
                id="onb-type"
                className="flex h-10 w-full max-w-md rounded-lg border border-border bg-background px-3 text-sm"
                value={documentType}
                onChange={(e) =>
                  setDocumentType(e.target.value as EmployeeOnboardingDocumentType)
                }
              >
                {EMPLOYEE_ONBOARDING_DOCUMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="onb-file">File</Label>
              <Input
                id="onb-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              type="button"
              disabled={!file || uploadMut.isPending}
              onClick={() => uploadMut.mutate()}
            >
              Upload
            </Button>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard level={2} header={<h3 className="text-sm font-semibold">Uploaded files</h3>}>
        {docsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : docsQuery.error ? (
          <p className="text-sm text-destructive">{(docsQuery.error as Error).message}</p>
        ) : !docsQuery.data?.length ? (
          <p className="text-sm text-muted-foreground">No onboarding documents yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {docsQuery.data.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {labelForEmployeeOnboardingDocumentType(row.documentType)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{row.originalFilename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(row.sizeBytes)} · {formatDate(row.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void api.download(row.id, row.originalFilename).catch((e) => {
                        if (e instanceof ApiError) toast.error(e.message);
                        else toast.error("Download failed");
                      });
                    }}
                  >
                    Download
                  </Button>
                  {canWrite ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[var(--danger-text)]"
                      disabled={deleteMut.isPending}
                      onClick={() => {
                        if (!window.confirm(`Remove ${row.originalFilename}?`)) return;
                        deleteMut.mutate(row.id);
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
