"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FileStack, Loader2 } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import {
  fetchMeOnboardingDocuments,
  downloadMeOnboardingDocument,
  labelForEmployeeOnboardingDocumentType,
} from "@/lib/api/employee-onboarding-documents";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { formatDate } from "@/lib/utils/formatters";
import { toast } from "sonner";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmployeeDocumentsPage() {
  const token = useAuthStore((s) => s.token);

  const query = useQuery({
    queryKey: ["me", "onboarding-documents", token],
    queryFn: () => fetchMeOnboardingDocuments(token!),
    enabled: !!token,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Document center
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Files your HR team uploaded while completing your onboarding (PAN, ID proofs, offer letter,
          etc.). Download copies anytime — you cannot replace them here; ask HR if something needs
          updating.
        </p>
      </div>

      <GlassCard
        level={2}
        header={
          <div className="flex items-center gap-2">
            <FileStack className="size-4 opacity-80" />
            <h2 className="text-sm font-semibold">Onboarding documents</h2>
          </div>
        }
      >
        {query.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : query.error ? (
          <p className="text-sm text-destructive">{(query.error as Error).message}</p>
        ) : !query.data?.length ? (
          <p className="text-sm text-muted-foreground">
            No documents on file yet. When your employer uploads onboarding paperwork, it will
            appear here.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {query.data.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">
                    {labelForEmployeeOnboardingDocumentType(row.documentType)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground" title={row.originalFilename}>
                    {row.originalFilename} · {formatBytes(row.sizeBytes)} ·{" "}
                    {row.mimeType.split("/")[1] ?? row.mimeType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {formatDate(row.createdAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => {
                    void (async () => {
                      try {
                        await downloadMeOnboardingDocument(token!, row.id, row.originalFilename);
                      } catch (e) {
                        if (e instanceof ApiError) toast.error(e.message);
                        else toast.error("Download failed");
                      }
                    })();
                  }}
                >
                  <Download className="size-3.5" />
                  Download
                </Button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
