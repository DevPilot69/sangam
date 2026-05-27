"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Inbox as InboxIcon, RefreshCcw, Search } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils/formatters";
import { getApiBaseUrl } from "@/lib/api/client";

type MockEmail = {
  id: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  body: string;
  category: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type Envelope<T> = { success: boolean; data: T };

async function fetchInbox(filters: {
  email?: string;
  category?: string;
  take?: number;
}): Promise<MockEmail[]> {
  const qs = new URLSearchParams();
  if (filters.email) qs.set("email", filters.email);
  if (filters.category) qs.set("category", filters.category);
  if (filters.take) qs.set("take", String(filters.take));
  const url = `${getApiBaseUrl()}/v1/_inbox${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        "Inbox is only available in demo mode (DEMO_MODE=true).",
      );
    }
    throw new Error(`Inbox fetch failed (${res.status})`);
  }
  const json = (await res.json()) as Envelope<MockEmail[]>;
  return json.data ?? [];
}

/**
 * Platform Inbox UI for the @sangam/demo MockEmail provider.
 *
 * Surfaces the `MockEmail` rows written by `email.sendEmail()` so testers
 * can read OTPs / password-reset tokens / invite links during demos
 * without configuring a real SendGrid account. Disabled in production
 * (DEMO_MODE=false) — backend route returns 404 in that case.
 */
export default function PlatformInboxPage() {
  const [emailFilter, setEmailFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["platform", "inbox", emailFilter, categoryFilter],
    queryFn: () =>
      fetchInbox({
        email: emailFilter.trim() || undefined,
        category: categoryFilter.trim() || undefined,
        take: 50,
      }),
    refetchInterval: 5000,
  });

  const selected = data?.find((m) => m.id === selectedId) ?? data?.[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight flex items-center gap-2">
          <InboxIcon className="size-7" /> Email inbox
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Demo-mode capture of every outbound email (OTPs, password resets,
          invites). Polls every 5 seconds. Disabled when DEMO_MODE=false.
        </p>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grow min-w-[240px]">
            <Label htmlFor="emailFilter">Filter by recipient</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="emailFilter"
                className="pl-8"
                placeholder="user@example.com"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <Label htmlFor="categoryFilter">Category</Label>
            <Input
              id="categoryFilter"
              placeholder="otp / reset / invite"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCcw className="mr-1.5 size-4" />
            Refresh
          </Button>
        </div>
      </GlassCard>

      {isError && (
        <GlassCard className="p-4 border-destructive/40">
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
        <GlassCard className="p-0 overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : (data?.length ?? 0) === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No messages yet. Trigger a login / register / reset flow.
              </p>
            ) : (
              <ul>
                {data!.map((m) => {
                  const active = m.id === (selected?.id ?? null);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(m.id)}
                        className={`w-full text-left p-3 border-b border-border last:border-b-0 transition-colors hover:bg-muted/40 ${
                          active ? "bg-[var(--brand-500)]/10" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {m.subject}
                          </p>
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {m.category ?? "—"}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          To: {m.toEmail}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDate(m.createdAt)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          {selected ? (
            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {selected.subject}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  From {selected.fromEmail} · To {selected.toEmail} ·{" "}
                  {formatDate(selected.createdAt)}
                  {selected.category && ` · ${selected.category}`}
                </p>
              </div>
              <pre className="whitespace-pre-wrap rounded-lg bg-muted/30 p-3 text-sm font-mono leading-relaxed">
                {selected.body}
              </pre>
              {selected.metadata &&
                Object.keys(selected.metadata).length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">
                      Metadata
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded bg-muted/40 p-2 font-mono">
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </details>
                )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a message to view its body.
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
