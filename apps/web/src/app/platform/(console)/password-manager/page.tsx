"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PasswordAccountsTable } from "@/components/password-manager/password-accounts-table";
import { ResetPasswordDialog } from "@/components/password-manager/reset-password-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api/client";
import { fetchPlatformTenants } from "@/lib/api/platform";
import type { PasswordManagerAccount } from "@/lib/api/password-manager";
import type { PasswordManagerFilter } from "@/lib/api/platform-password-manager";
import {
  fetchPlatformPasswordManagerAccounts,
  resetPlatformEmployeePassword,
  resetPlatformUserPassword,
} from "@/lib/api/platform-password-manager";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";

export default function PlatformPasswordManagerPage() {
  const token = usePlatformAuthStore((s) => s.token);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantIdFromUrl = searchParams.get("tenantId") ?? "";
  const tabFromUrl = searchParams.get("tab") ?? "all";

  const [tenantId, setTenantId] = useState(tenantIdFromUrl);
  const [filter, setFilter] = useState<PasswordManagerFilter>(
    tabFromUrl === "tenant_admin" || tabFromUrl === "employee" ? tabFromUrl : "all"
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PasswordManagerAccount | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (tenantIdFromUrl && tenantIdFromUrl !== tenantId) setTenantId(tenantIdFromUrl);
  }, [tenantIdFromUrl, tenantId]);

  const tenantsQuery = useQuery({
    queryKey: ["platform", "tenants", token],
    queryFn: () => fetchPlatformTenants(token!),
    enabled: !!token,
  });

  const accountsQuery = useQuery({
    queryKey: ["platform", "password-manager", tenantId, filter, token],
    queryFn: () => fetchPlatformPasswordManagerAccounts(token!, tenantId, filter),
    enabled: !!token && !!tenantId,
  });

  const resetMut = useMutation({
    mutationFn: async (account: PasswordManagerAccount) => {
      if (account.userId) {
        return resetPlatformUserPassword(token!, tenantId, account.userId);
      }
      if (account.employeeId) {
        return resetPlatformEmployeePassword(token!, tenantId, account.employeeId);
      }
      throw new Error("Invalid account");
    },
    onSuccess: (res) => {
      toast.success(
        res.portalCreated
          ? "Portal account created with default password."
          : "Password reset to default."
      );
      setDialogOpen(false);
      void qc.invalidateQueries({ queryKey: ["platform", "password-manager"] });
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Could not reset password");
    },
  });

  const selectedTenant = tenantsQuery.data?.find((t) => t.id === tenantId);

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

  function onTenantChange(id: string) {
    setTenantId(id);
    const q = new URLSearchParams();
    if (id) q.set("tenantId", id);
    if (filter !== "all") q.set("tab", filter);
    router.replace(`/platform/password-manager${q.toString() ? `?${q}` : ""}`);
  }

  function onFilterChange(value: string) {
    setFilter(value as PasswordManagerFilter);
    const q = new URLSearchParams();
    if (tenantId) q.set("tenantId", tenantId);
    if (value !== "all") q.set("tab", value);
    router.replace(`/platform/password-manager${q.toString() ? `?${q}` : ""}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Password manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reset passwords to each organization&apos;s default (company code + keyword). Employees
          sign in with company code + employee ID as username.
        </p>
      </div>

      <GlassCard level={2} className="grid gap-4 p-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tenant">Organization *</Label>
          <select
            id="tenant"
            className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            value={tenantId}
            onChange={(e) => onTenantChange(e.target.value)}
          >
            <option value="">Select a tenant…</option>
            {(tenantsQuery.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.companyCode ? `[${t.companyCode}] ` : ""}
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
          {selectedTenant ? (
            <p className="text-xs text-muted-foreground">
              Company code:{" "}
              <span className="font-mono font-medium">{selectedTenant.companyCode ?? "—"}</span>
              {" · "}
              <Link href={`/platform/tenants/${selectedTenant.id}`} className="underline">
                View tenant profile
              </Link>
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="search">Search accounts</Label>
          <Input
            id="search"
            placeholder="Name, username, email, or employee code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!tenantId}
          />
        </div>
      </GlassCard>

      {!tenantId ? (
        <GlassCard level={2} className="p-8 text-center text-sm text-muted-foreground">
          Select an organization to manage passwords.
        </GlassCard>
      ) : (
        <Tabs value={filter} onValueChange={onFilterChange}>
          <TabsList className="glass-2 border border-border">
            <TabsTrigger value="all">All accounts</TabsTrigger>
            <TabsTrigger value="tenant_admin">Tenant admins</TabsTrigger>
            <TabsTrigger value="employee">Employees</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="mt-6">
            <PasswordAccountsTable
              rows={rows}
              isLoading={accountsQuery.isLoading}
              isError={accountsQuery.isError}
              onReset={(account) => {
                setSelected(account);
                setDialogOpen(true);
              }}
              emptyMessage="No accounts match this filter."
            />
          </TabsContent>
        </Tabs>
      )}

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
