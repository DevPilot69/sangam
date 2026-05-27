"use client";

import { useQuery } from "@tanstack/react-query";

import { GlassCard } from "@/components/ui/glass-card";
import { fetchAuditLogs } from "@/lib/api/audit";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function AuditLogsPage() {
  const token = useAuthStore((s) => s.token);

  const logsQuery = useQuery({
    queryKey: ["audit-logs", token],
    queryFn: () => fetchAuditLogs(token!, { limit: 100 }),
    enabled: !!token,
  });

  const rows = logsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Audit logs</h1>
      <GlassCard level={2} className="overflow-hidden p-0">
        {logsQuery.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No audit events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">When</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Entity</th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.action}</td>
                    <td className="px-4 py-3">
                      {r.entityType}
                      {r.entityId ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          {r.entityId.slice(0, 8)}…
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{r.userName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
