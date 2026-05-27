"use client";

import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { PasswordManagerAccount } from "@/lib/api/password-manager";

type Props = {
  rows: PasswordManagerAccount[];
  isLoading?: boolean;
  isError?: boolean;
  canManage?: boolean;
  onReset: (account: PasswordManagerAccount) => void;
  emptyMessage?: string;
};

export function PasswordAccountsTable({
  rows,
  isLoading,
  isError,
  canManage = true,
  onReset,
  emptyMessage = "No accounts found.",
}: Props) {
  return (
    <GlassCard level={2} className="overflow-hidden p-0">
      {isLoading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading accounts…</p>
      ) : isError ? (
        <p className="p-6 text-sm text-destructive">Could not load accounts.</p>
      ) : rows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Login username</th>
                <th className="px-4 py-3 font-medium">Default password</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.userId ?? row.employeeId ?? row.email}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.name}</p>
                    {row.employeeCode ? (
                      <p className="font-mono text-xs text-muted-foreground">{row.employeeCode}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {row.accountType === "tenant_admin" ? "Tenant admin" : "Employee"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.loginUsername ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.defaultPassword}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canManage}
                      onClick={() => onReset(row)}
                    >
                      <KeyRound className="size-4" />
                      Reset to default
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}
