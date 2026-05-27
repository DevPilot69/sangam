"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmployeeEditForm } from "@/components/employees/employee-edit-form";
import { EmployeeOnboardingDocumentsPanel } from "@/components/employees/employee-onboarding-documents-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deletePlatformEmployeeOnboardingDocument,
  downloadPlatformEmployeeOnboardingDocument,
  fetchPlatformEmployeeOnboardingDocuments,
  uploadPlatformEmployeeOnboardingDocument,
} from "@/lib/api/employee-onboarding-documents";
import { EmploymentStatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ApiError } from "@/lib/api/client";
import {
  deletePlatformTenantEmployee,
  fetchPlatformTenantDepartments,
  fetchPlatformTenantDesignations,
  fetchPlatformTenantEmployee,
  updatePlatformTenantEmployee,
  updatePlatformTenantEmployeeBank,
} from "@/lib/api/platform-employees";
import { employeeToFormValues } from "@/lib/employees/form";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";
import { formatCurrency, formatDate, formatEmployeeId } from "@/lib/utils/formatters";
import type { EmploymentStatus } from "@/types";
import type { ApiEmploymentStatus } from "@/lib/api/employees";

function mapStatus(s: ApiEmploymentStatus): EmploymentStatus {
  const m: Record<ApiEmploymentStatus, EmploymentStatus> = {
    ACTIVE: "active",
    ON_LEAVE: "on_leave",
    NOTICE: "notice",
    INACTIVE: "inactive",
  };
  return m[s] ?? "active";
}

export default function PlatformEmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";
  const token = usePlatformAuthStore((s) => s.token);
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [revealBank, setRevealBank] = useState(false);
  const [tab, setTab] = useState("overview");

  const employeeQuery = useQuery({
    queryKey: ["platform", "employee", tenantId, id, token, revealBank],
    queryFn: () => fetchPlatformTenantEmployee(token!, tenantId, id, { revealBank }),
    enabled: !!token && !!tenantId && !!id,
  });

  const depts = useQuery({
    queryKey: ["platform", "org", "departments", tenantId, token],
    queryFn: () => fetchPlatformTenantDepartments(token!, tenantId),
    enabled: !!token && !!tenantId,
  });

  const desigs = useQuery({
    queryKey: ["platform", "org", "designations", tenantId, token],
    queryFn: () => fetchPlatformTenantDesignations(token!, tenantId),
    enabled: !!token && !!tenantId,
  });

  const saveMut = useMutation({
    mutationFn: async (payload: {
      profile: Record<string, unknown>;
      bank?: Record<string, unknown>;
    }) => {
      await updatePlatformTenantEmployee(token!, tenantId, id, payload.profile);
      if (payload.bank) {
        await updatePlatformTenantEmployeeBank(token!, tenantId, id, payload.bank);
      }
    },
    onSuccess: () => {
      toast.success("Employee updated");
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Update failed");
    },
  });

  const removeMut = useMutation({
    mutationFn: () => deletePlatformTenantEmployee(token!, tenantId, id),
    onSuccess: () => {
      toast.success("Employee deactivated");
      void qc.invalidateQueries({ queryKey: ["platform"] });
      router.push(`/platform/employees?tenantId=${tenantId}`);
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Could not deactivate");
    },
  });

  const employee = employeeQuery.data;
  const initials = useMemo(() => {
    if (!employee) return "?";
    return `${employee.firstName[0] ?? ""}${employee.lastName[0] ?? ""}`.toUpperCase();
  }, [employee]);

  const formValues = useMemo(
    () => (employee ? employeeToFormValues(employee) : null),
    [employee]
  );

  if (!tenantId) {
    return (
      <p className="text-sm text-muted-foreground">
        Missing tenant. Open from the{" "}
        <Link href="/platform/employees" className="underline">
          employees list
        </Link>
        .
      </p>
    );
  }

  if (employeeQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading employee…</p>;
  }

  if (!employee) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">Employee not found.</p>
        <Link
          href={`/platform/employees?tenantId=${tenantId}`}
          className={buttonVariants({ variant: "link", className: "mt-4 px-0" })}
        >
          ← All employees
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/platform/employees?tenantId=${encodeURIComponent(tenantId)}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Employees
      </Link>

      <GlassCard level={2}>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="size-16 border border-border">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="text-muted-foreground">
                {employee.designationTitle ?? "—"} · {employee.departmentName ?? "—"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatEmployeeId(employee.employeeCode)} · Joined{" "}
                {formatDate(employee.dateOfJoining)} ·{" "}
                <EmploymentStatusBadge status={mapStatus(employee.status)} />
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel edit" : "Edit profile"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removeMut.isPending || !!employee.deactivatedAt}
              onClick={() => {
                if (!window.confirm("Deactivate this employee?")) return;
                removeMut.mutate();
              }}
            >
              Deactivate
            </Button>
          </div>
        </div>
      </GlassCard>

      {editing && formValues ? (
        <EmployeeEditForm
          initialValues={formValues}
          departments={depts.data ?? []}
          designations={desigs.data ?? []}
          saving={saveMut.isPending}
          includeBankFields
          onSave={async (payload) => {
            await saveMut.mutateAsync(payload);
          }}
        />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="glass-2 border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Onboarding documents</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <GlassCard level={2} header={<h2 className="text-sm font-semibold">Personal</h2>}>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd>{employee.email}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">PAN</dt>
                    <dd className="font-mono">{employee.pan ?? "—"}</dd>
                  </div>
                </dl>
              </GlassCard>
              <GlassCard level={2} header={<h2 className="text-sm font-semibold">Compensation</h2>}>
                <p className="text-2xl font-bold tabular-nums text-[var(--gold-400)]">
                  {employee.ctcAnnual != null ? formatCurrency(employee.ctcAnnual) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Annual CTC</p>
              </GlassCard>
              <GlassCard level={2} header={<h2 className="text-sm font-semibold">Bank details</h2>}>
                <p className="font-mono text-sm">{employee.bankAccount ?? "—"}</p>
                <p className="mt-2 font-mono text-sm">{employee.ifsc ?? "—"}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setRevealBank((v) => !v)}
                >
                  {revealBank ? "Mask bank details" : "Reveal full bank / IFSC"}
                </Button>
              </GlassCard>
            </div>
          </TabsContent>
          <TabsContent value="documents" className="mt-4">
            <EmployeeOnboardingDocumentsPanel
              canWrite
              api={{
                queryKey: ["platform", "employee", tenantId, id, "onboarding-documents", token ?? ""],
                fetch: () => fetchPlatformEmployeeOnboardingDocuments(token!, tenantId, id),
                upload: (file, documentType) =>
                  uploadPlatformEmployeeOnboardingDocument(token!, tenantId, id, file, documentType),
                download: (documentId, filename) =>
                  downloadPlatformEmployeeOnboardingDocument(
                    token!,
                    tenantId,
                    id,
                    documentId,
                    filename
                  ),
                remove: (documentId) =>
                  deletePlatformEmployeeOnboardingDocument(token!, tenantId, id, documentId),
              }}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
