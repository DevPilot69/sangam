"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { DepartmentsManager } from "@/components/organization/departments-manager";
import { DesignationsManager } from "@/components/organization/designations-manager";
import { HolidayCalendarManager } from "@/components/organization/holiday-calendar-manager";
import {
  deletePlatformTenantHoliday,
  fetchPlatformTenantHolidays,
  upsertPlatformTenantHolidays,
} from "@/lib/api/platform-holidays";
import { GlassCard } from "@/components/ui/glass-card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchPlatformTenants } from "@/lib/api/platform";
import {
  createPlatformTenantDepartment,
  createPlatformTenantDesignation,
  deletePlatformTenantDepartment,
  deletePlatformTenantDesignation,
  fetchPlatformTenantDepartmentsFull,
  fetchPlatformTenantDesignationsFull,
  updatePlatformTenantDepartment,
  updatePlatformTenantDesignation,
} from "@/lib/api/platform-organization";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";

export default function PlatformOrganizationPage() {
  const token = usePlatformAuthStore((s) => s.token);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantIdFromUrl = searchParams.get("tenantId") ?? "";
  const tabFromUrl = searchParams.get("tab") ?? "departments";

  const [tenantId, setTenantId] = useState(tenantIdFromUrl);
  const [tab, setTab] = useState(tabFromUrl === "designations" ? "designations" : "departments");
  const qc = useQueryClient();

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

  const deptsQuery = useQuery({
    queryKey: ["platform", "org", "departments", tenantId, token],
    queryFn: () => fetchPlatformTenantDepartmentsFull(token!, tenantId),
    enabled: !!token && !!tenantId,
  });

  const desigsQuery = useQuery({
    queryKey: ["platform", "org", "designations", tenantId, token],
    queryFn: () => fetchPlatformTenantDesignationsFull(token!, tenantId),
    enabled: !!token && !!tenantId,
  });

  const selectedTenant = tenantsQuery.data?.find((t) => t.id === tenantId);

  function onTenantChange(id: string) {
    setTenantId(id);
    const q = new URLSearchParams();
    if (id) q.set("tenantId", id);
    if (tab !== "departments") q.set("tab", tab);
    const qs = q.toString();
    router.replace(`/platform/organization${qs ? `?${qs}` : ""}`);
  }

  function onTabChange(value: string) {
    setTab(value);
    const q = new URLSearchParams();
    if (tenantId) q.set("tenantId", tenantId);
    if (value !== "departments") q.set("tab", value);
    const qs = q.toString();
    router.replace(`/platform/organization${qs ? `?${qs}` : ""}`);
  }

  const invalidateOrg = () => {
    void qc.invalidateQueries({ queryKey: ["platform", "org"] });
  };

  const deptMut = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: invalidateOrg,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage departments and designations for any tenant on the platform.
        </p>
      </div>

      <GlassCard level={2} className="p-4">
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
      </GlassCard>

      {!tenantId ? (
        <GlassCard level={2} className="p-8 text-center text-sm text-muted-foreground">
          Select an organization to manage its departments and designations.
        </GlassCard>
      ) : (
        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList className="glass-2 border border-border">
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="designations">Designations</TabsTrigger>
            <TabsTrigger value="holidays">Holiday calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="departments" className="mt-6">
            <DepartmentsManager
              rows={deptsQuery.data ?? []}
              isLoading={deptsQuery.isLoading}
              isError={deptsQuery.isError}
              saving={deptMut.isPending}
              onCreate={async (body) => {
                await deptMut.mutateAsync(() =>
                  createPlatformTenantDepartment(token!, tenantId, body)
                );
              }}
              onUpdate={async (id, body) => {
                await deptMut.mutateAsync(() =>
                  updatePlatformTenantDepartment(token!, tenantId, id, body)
                );
              }}
              onDelete={async (id) => {
                await deptMut.mutateAsync(() =>
                  deletePlatformTenantDepartment(token!, tenantId, id)
                );
              }}
            />
          </TabsContent>

          <TabsContent value="designations" className="mt-6">
            <DesignationsManager
              rows={desigsQuery.data ?? []}
              departments={deptsQuery.data ?? []}
              isLoading={desigsQuery.isLoading || deptsQuery.isLoading}
              isError={desigsQuery.isError}
              saving={deptMut.isPending}
              onCreate={async (body) => {
                await deptMut.mutateAsync(() =>
                  createPlatformTenantDesignation(token!, tenantId, body)
                );
              }}
              onUpdate={async (id, body) => {
                await deptMut.mutateAsync(() =>
                  updatePlatformTenantDesignation(token!, tenantId, id, body)
                );
              }}
              onDelete={async (id) => {
                await deptMut.mutateAsync(() =>
                  deletePlatformTenantDesignation(token!, tenantId, id)
                );
              }}
            />
          </TabsContent>

          <TabsContent value="holidays" className="mt-6">
            <HolidayCalendarManager
              title={`Holidays — ${selectedTenant?.name ?? "organization"}`}
              description="Organization-specific holidays for this tenant (merged with platform defaults for employees)."
              readOnlyPlatformNote="Platform-wide defaults apply to all tenants. Entries below are specific to this organization."
              api={{
                queryKey: ["platform", "tenant-holidays", tenantId, token ?? ""],
                fetch: (year) => fetchPlatformTenantHolidays(token!, tenantId, year),
                upsert: (holidays) => upsertPlatformTenantHolidays(token!, tenantId, holidays),
                update: () => Promise.resolve(),
                remove: (id) => deletePlatformTenantHoliday(token!, tenantId, id),
                canEditRow: (row) => row.source === "tenant",
              }}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
