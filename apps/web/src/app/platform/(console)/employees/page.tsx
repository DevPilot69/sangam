"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmploymentStatusBadge } from "@/components/ui/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchPlatformTenants } from "@/lib/api/platform";
import { fetchPlatformTenantEmployees } from "@/lib/api/platform-employees";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";
import { formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

export default function PlatformEmployeesPage() {
  const token = usePlatformAuthStore((s) => s.token);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantIdFromUrl = searchParams.get("tenantId") ?? "";

  const [tenantId, setTenantId] = useState(tenantIdFromUrl);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (tenantIdFromUrl && tenantIdFromUrl !== tenantId) {
      setTenantId(tenantIdFromUrl);
    }
  }, [tenantIdFromUrl, tenantId]);

  const tenantsQuery = useQuery({
    queryKey: ["platform", "tenants", token],
    queryFn: () => fetchPlatformTenants(token!),
    enabled: !!token,
  });

  const employeesQuery = useQuery({
    queryKey: ["platform", "employees", tenantId, search, token],
    queryFn: () =>
      fetchPlatformTenantEmployees(token!, tenantId, {
        page: 1,
        pageSize: 100,
        search: search || undefined,
      }),
    enabled: !!token && !!tenantId,
  });

  const selectedTenant = useMemo(
    () => tenantsQuery.data?.find((t) => t.id === tenantId),
    [tenantsQuery.data, tenantId]
  );

  function onTenantChange(id: string) {
    setTenantId(id);
    const q = id ? `?tenantId=${encodeURIComponent(id)}` : "";
    router.replace(`/platform/employees${q}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Onboard and manage employees for any organization on the platform.
          </p>
        </div>
        {tenantId ? (
          <Link
            href={`/platform/employees/new?tenantId=${encodeURIComponent(tenantId)}`}
            className={buttonVariants()}
          >
            <Plus className="size-4" />
            Add employee
          </Link>
        ) : null}
      </div>

      <GlassCard level={2} className="p-4">
        <div className="grid gap-4 md:grid-cols-2">
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
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
            {selectedTenant ? (
              <p className="text-xs text-muted-foreground">
                <Link href={`/platform/tenants/${selectedTenant.id}`} className="underline">
                  View tenant profile
                </Link>
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="search">Search employees</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                className="pl-9"
                placeholder="Name, email, or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={!tenantId}
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {!tenantId ? (
        <GlassCard level={2} className="flex flex-col items-center gap-3 p-10 text-center">
          <Users className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Select an organization to view its employees.</p>
        </GlassCard>
      ) : employeesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading employees…</p>
      ) : !employeesQuery.data?.items.length ? (
        <GlassCard level={2} className="p-8 text-center text-sm text-muted-foreground">
          No employees yet.{" "}
          <Link
            href={`/platform/employees/new?tenantId=${tenantId}`}
            className="text-[var(--brand-500)] underline"
          >
            Add the first employee
          </Link>
        </GlassCard>
      ) : (
        <GlassCard level={2} className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Employee</th>
                  <th className="px-4 py-3 text-left font-medium">Code</th>
                  <th className="px-4 py-3 text-left font-medium">Department</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {employeesQuery.data.items.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/platform/employees/${e.id}?tenantId=${tenantId}`}
                        className="font-medium hover:underline"
                      >
                        {e.firstName} {e.lastName}
                      </Link>
                      <p className="text-xs text-muted-foreground">{e.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{e.employeeCode}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.departmentName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <EmploymentStatusBadge
                        status={
                          e.status === "ACTIVE"
                            ? "active"
                            : e.status === "ON_LEAVE"
                              ? "on_leave"
                              : e.status === "NOTICE"
                                ? "notice"
                                : "inactive"
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(e.dateOfJoining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
