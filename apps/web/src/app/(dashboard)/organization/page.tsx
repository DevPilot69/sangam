"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GlassCard } from "@/components/ui/glass-card";
import { ApiError } from "@/lib/api/client";

import { DepartmentsManager } from "@/components/organization/departments-manager";
import { DesignationsManager } from "@/components/organization/designations-manager";
import { HolidayCalendarManager } from "@/components/organization/holiday-calendar-manager";
import {
  deleteTenantHoliday,
  fetchTenantHolidays,
  upsertTenantHolidays,
} from "@/lib/api/holidays";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createDepartment,
  createDesignation,
  deleteDepartment,
  deleteDesignation,
  fetchDepartments,
  fetchDesignations,
  fetchTenant,
  patchTenant,
  updateDepartment,
  updateDesignation,
} from "@/lib/api/tenant";
import { TenantLegalDocumentsManager } from "@/components/organization/tenant-legal-documents-manager";
import { fetchTenantLegalDocuments } from "@/lib/api/tenant-legal-documents";
import { Permission } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/auth/auth-store";
import { usePermissions } from "@/lib/hooks/use-permissions";

export default function OrganizationPage() {
  const token = useAuthStore((s) => s.token);
  const { hasPermission } = usePermissions();
  const canReadSettings = hasPermission(Permission["settings:read"]);
  const canWrite = hasPermission(Permission["settings:write"]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") ?? "departments";
  const validTabs = ["departments", "designations", "holidays", "legal"] as const;
  const initialTab = validTabs.includes(tabFromUrl as (typeof validTabs)[number])
    ? (tabFromUrl as (typeof validTabs)[number])
    : "departments";
  const [tab, setTab] = useState<(typeof validTabs)[number]>(initialTab);
  const qc = useQueryClient();

  const tenantQuery = useQuery({
    queryKey: ["tenant", "profile", token],
    queryFn: () => fetchTenant(token!),
    enabled: !!token,
  });

  useEffect(() => {
    if (!validTabs.includes(tabFromUrl as (typeof validTabs)[number])) return;
    const next = tabFromUrl as (typeof validTabs)[number];
    if (next !== tab) setTab(next);
  }, [tabFromUrl, tab]);

  useEffect(() => {
    if (!canReadSettings && tab === "legal") {
      setTab("departments");
      router.replace("/organization");
    }
  }, [canReadSettings, tab, router]);

  const legalDocsQuery = useQuery({
    queryKey: ["tenant", "legal-documents", token],
    queryFn: () => fetchTenantLegalDocuments(token!),
    enabled: !!token && canReadSettings,
  });

  const deptsQuery = useQuery({
    queryKey: ["tenant", "departments", token],
    queryFn: () => fetchDepartments(token!),
    enabled: !!token,
  });

  const desigsQuery = useQuery({
    queryKey: ["tenant", "designations", token],
    queryFn: () => fetchDesignations(token!),
    enabled: !!token,
  });

  function onTabChange(value: string) {
    const v = value as (typeof validTabs)[number];
    setTab(v);
    const q = v === "departments" ? "" : `?tab=${v}`;
    router.replace(`/organization${q}`);
  }

  const invalidateOrg = () => {
    void qc.invalidateQueries({ queryKey: ["tenant", "departments"] });
    void qc.invalidateQueries({ queryKey: ["tenant", "designations"] });
  };

  const saveMut = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: invalidateOrg,
  });

  if (!token) {
    return <p className="text-sm text-muted-foreground">Sign in to manage organization structure.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Departments and designations for your workspace. Use these when onboarding employees and
          running payroll.
        </p>
      </div>

      <GlassCard level={2} className="p-4">
        <h2 className="text-sm font-semibold">Company code</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Prefix for employee portal logins (e.g. BR + employee ID). Only Vetan platform super admin
          can create or change this code.
        </p>
        <p className="mt-3 font-mono text-lg font-semibold tracking-wide">
          {tenantQuery.data?.companyCode ?? "Not assigned yet"}
        </p>
      </GlassCard>

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="glass-2 border border-border">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="designations">Designations</TabsTrigger>
          {canReadSettings ? <TabsTrigger value="holidays">Holiday calendar</TabsTrigger> : null}
          {canReadSettings ? <TabsTrigger value="legal">Legal documents</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="departments" className="mt-6">
          <DepartmentsManager
            rows={deptsQuery.data ?? []}
            isLoading={deptsQuery.isLoading}
            isError={deptsQuery.isError}
            canWrite={canWrite}
            saving={saveMut.isPending}
            onCreate={async (body) => {
              await saveMut.mutateAsync(() => createDepartment(token, body));
            }}
            onUpdate={async (id, body) => {
              await saveMut.mutateAsync(() => updateDepartment(token, id, body));
            }}
            onDelete={async (id) => {
              await saveMut.mutateAsync(() => deleteDepartment(token, id));
            }}
          />
        </TabsContent>

        <TabsContent value="designations" className="mt-6">
          <DesignationsManager
            rows={desigsQuery.data ?? []}
            departments={deptsQuery.data ?? []}
            isLoading={desigsQuery.isLoading || deptsQuery.isLoading}
            isError={desigsQuery.isError}
            canWrite={canWrite}
            saving={saveMut.isPending}
            onCreate={async (body) => {
              await saveMut.mutateAsync(() => createDesignation(token, body));
            }}
            onUpdate={async (id, body) => {
              await saveMut.mutateAsync(() => updateDesignation(token, id, body));
            }}
            onDelete={async (id) => {
              await saveMut.mutateAsync(() => deleteDesignation(token, id));
            }}
          />
        </TabsContent>

        {canReadSettings ? (
          <TabsContent value="holidays" className="mt-6">
            <HolidayCalendarManager
              title="Organization calendar"
              description="Merged with platform-wide defaults; employees see the combined list."
              readOnlyPlatformNote="Managed at platform level for all organizations. Add a date here to override or add organization-only holidays."
              api={{
                queryKey: ["tenant", "holidays", token],
                fetch: (year) => fetchTenantHolidays(token!, year),
                upsert: (holidays) => upsertTenantHolidays(token!, holidays),
                update: () => Promise.resolve(),
                remove: (id) => deleteTenantHoliday(token!, id),
                canEditRow: (row) => canWrite && row.source === "tenant",
              }}
            />
          </TabsContent>
        ) : null}

        {canReadSettings ? (
          <TabsContent value="legal" className="mt-6">
            <TenantLegalDocumentsManager
              mode="tenant"
              documents={legalDocsQuery.data ?? []}
              canManage={canWrite}
              token={token}
              queryKeyToInvalidate={["tenant", "legal-documents", token]}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
