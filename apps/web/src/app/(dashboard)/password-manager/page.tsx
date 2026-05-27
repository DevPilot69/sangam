"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PasswordAccountsTable } from "@/components/password-manager/password-accounts-table";
import { ResetPasswordDialog } from "@/components/password-manager/reset-password-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import type { PasswordManagerAccount } from "@/lib/api/password-manager";
import {
  fetchTenantPasswordManagerEmployees,
  resetTenantEmployeePassword,
} from "@/lib/api/password-manager";
import { fetchTenant } from "@/lib/api/tenant";
import { Permission } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/auth/auth-store";
import { usePermissions } from "@/lib/hooks/use-permissions";

export default function TenantPasswordManagerPage() {
  const token = useAuthStore((s) => s.token);
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(Permission["settings:write"]);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PasswordManagerAccount | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const tenantQuery = useQuery({
    queryKey: ["tenant", token],
    queryFn: () => fetchTenant(token!),
    enabled: !!token,
  });

  const accountsQuery = useQuery({
    queryKey: ["tenant", "password-manager", token],
    queryFn: () => fetchTenantPasswordManagerEmployees(token!),
    enabled: !!token,
  });

  const resetMut = useMutation({
    mutationFn: (account: PasswordManagerAccount) => {
      if (account.employeeId) {
        return resetTenantEmployeePassword(token!, account.employeeId);
      }
      throw new Error("Employee record required");
    },
    onSuccess: (res) => {
      toast.success(
        res.portalCreated
          ? "Portal account created with default password."
          : "Password reset to default."
      );
      setDialogOpen(false);
      void qc.invalidateQueries({ queryKey: ["tenant", "password-manager"] });
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Could not reset password");
    },
  });

  const rows = useMemo(() => {
    const list = accountsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.employeeCode?.toLowerCase().includes(q) ?? false) ||
        (a.loginUsername?.toLowerCase().includes(q) ?? false)
    );
  }, [accountsQuery.data, search]);

  if (!token) {
    return <p className="text-sm text-muted-foreground">Sign in to manage employee passwords.</p>;
  }

  const companyCode = tenantQuery.data?.companyCode;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Password manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reset employee portal passwords to your organization default. Username is company code +
          employee ID (e.g. {companyCode ?? "BR"}EMP-0001).
        </p>
        {companyCode ? (
          <p className="mt-2 text-sm">
            Company code: <span className="font-mono font-semibold">{companyCode}</span>
          </p>
        ) : null}
        {!canManage ? (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            You need settings write permission to reset passwords.
          </p>
        ) : null}
      </div>

      <GlassCard level={2} className="p-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search employees</Label>
          <Input
            id="search"
            placeholder="Name, username, email, or employee code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </GlassCard>

      <PasswordAccountsTable
        rows={rows}
        isLoading={accountsQuery.isLoading}
        isError={accountsQuery.isError}
        canManage={canManage}
        onReset={(account) => {
          setSelected(account);
          setDialogOpen(true);
        }}
        emptyMessage="No employees found."
      />

      <ResetPasswordDialog
        account={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        saving={resetMut.isPending}
        onConfirm={async () => {
          if (!selected) return;
          await resetMut.mutateAsync(selected);
        }}
      />
    </div>
  );
}
