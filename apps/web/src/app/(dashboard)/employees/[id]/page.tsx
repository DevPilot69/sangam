"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmployeeEditForm } from "@/components/employees/employee-edit-form";
import { EmploymentStatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteEmployeeOnboardingDocument,
  downloadEmployeeOnboardingDocument,
  EMPLOYEE_ONBOARDING_DOCUMENT_OPTIONS,
  fetchEmployeeOnboardingDocuments,
  labelForEmployeeOnboardingDocumentType,
  uploadEmployeeOnboardingDocument,
  type EmployeeOnboardingDocumentType,
} from "@/lib/api/employee-onboarding-documents";
import { ApiError } from "@/lib/api/client";
import {
  deleteEmployee,
  fetchEmployee,
  updateEmployee,
  updateEmployeeBank,
} from "@/lib/api/employees";
import type { ApiEmploymentStatus } from "@/lib/api/employees";
import { fetchDepartments, fetchDesignations } from "@/lib/api/tenant";
import { employeeToFormValues } from "@/lib/employees/form";
import { Permission } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/auth/auth-store";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type { EmploymentStatus } from "@/types";
import { formatCurrency, formatDate, formatEmployeeId } from "@/lib/utils/formatters";

function mapStatus(s: ApiEmploymentStatus): EmploymentStatus {
  const m: Record<ApiEmploymentStatus, EmploymentStatus> = {
    ACTIVE: "active",
    ON_LEAVE: "on_leave",
    NOTICE: "notice",
    INACTIVE: "inactive",
  };
  return m[s] ?? "active";
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const token = useAuthStore((s) => s.token);
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(Permission["employees:write"]);
  const canReadEmployees = hasPermission(Permission["employees:read"]);
  const qc = useQueryClient();
  const [tab, setTab] = useState("personal");
  const [revealBank, setRevealBank] = useState(false);
  const [editing, setEditing] = useState(false);
  const [onboardingDocType, setOnboardingDocType] = useState<EmployeeOnboardingDocumentType>("PAN_CARD");
  const [onboardingFile, setOnboardingFile] = useState<File | null>(null);

  const employeeQuery = useQuery({
    queryKey: ["employee", id, token, revealBank],
    enabled: Boolean(token) && Boolean(id),
    queryFn: () => fetchEmployee(token!, id, { revealBank: canWrite && revealBank }),
  });

  const onboardingDocsQuery = useQuery({
    queryKey: ["employee", id, "onboarding-documents", token],
    queryFn: () => fetchEmployeeOnboardingDocuments(token!, id),
    enabled: Boolean(token) && Boolean(id) && canReadEmployees && tab === "documents",
  });

  const depts = useQuery({
    queryKey: ["tenant", "departments", token],
    enabled: Boolean(token) && editing,
    queryFn: () => fetchDepartments(token!),
  });

  const desigs = useQuery({
    queryKey: ["tenant", "designations", token],
    enabled: Boolean(token) && editing,
    queryFn: () => fetchDesignations(token!),
  });

  const saveMut = useMutation({
    mutationFn: async (payload: {
      profile: Record<string, unknown>;
      bank?: Record<string, unknown>;
    }) => {
      await updateEmployee(token!, id, payload.profile);
      if (payload.bank && canWrite) {
        await updateEmployeeBank(token!, id, payload.bank);
      }
    },
    onSuccess: () => {
      toast.success("Employee updated");
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ["employee", id] });
      void qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Update failed");
    },
  });

  const removeMut = useMutation({
    mutationFn: () => deleteEmployee(token!, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee removed");
      router.push("/employees");
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Could not remove employee");
    },
  });

  const uploadOnboardingMut = useMutation({
    mutationFn: () => {
      if (!onboardingFile || !token) throw new Error("Choose a file");
      return uploadEmployeeOnboardingDocument(token, id, onboardingFile, onboardingDocType);
    },
    onSuccess: () => {
      toast.success("Document uploaded");
      setOnboardingFile(null);
      void qc.invalidateQueries({ queryKey: ["employee", id, "onboarding-documents"] });
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Upload failed");
    },
  });

  const deleteOnboardingMut = useMutation({
    mutationFn: (documentId: string) => deleteEmployeeOnboardingDocument(token!, id, documentId),
    onSuccess: () => {
      toast.success("Document removed");
      void qc.invalidateQueries({ queryKey: ["employee", id, "onboarding-documents"] });
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Delete failed");
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

  if (!token) {
    return (
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">Sign in to view this profile.</p>
        <Link href="/login" className={buttonVariants({ className: "mt-4" })}>
          Sign in
        </Link>
      </GlassCard>
    );
  }

  if (employeeQuery.isLoading) {
    return (
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </GlassCard>
    );
  }

  if (employeeQuery.isError || !employee) {
    return (
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">Employee not found.</p>
        <Link href="/employees" className={buttonVariants({ variant: "link", className: "mt-4 px-0" })}>
          ← All employees
        </Link>
      </GlassCard>
    );
  }

  function confirmDelete() {
    if (!window.confirm("Deactivate this employee? They will be hidden from the directory.")) return;
    removeMut.mutate();
  }

  return (
    <div className="space-y-6">
      <Link href="/employees" className="text-sm text-muted-foreground hover:text-foreground">
        ← All employees
      </Link>

      {employee.deactivatedAt ? (
        <div
          role="status"
          className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
        >
          This employee is deactivated.
        </div>
      ) : null}

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
                Joined {formatDate(employee.dateOfJoining)} ·{" "}
                <EmploymentStatusBadge status={mapStatus(employee.status)} />
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canWrite ? (
              <>
                <Button type="button" variant="outline" onClick={() => setEditing((v) => !v)}>
                  {editing ? "Cancel edit" : "Edit profile"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={removeMut.isPending}
                  onClick={confirmDelete}
                >
                  Deactivate
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </GlassCard>

      {editing && formValues && canWrite ? (
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
        <TabsList className="glass-2 flex-wrap border border-border">
          {["personal", "employment", "salary", "bank", "documents", "history"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="capitalize data-[state=active]:bg-[color-mix(in_srgb,var(--brand-500)_16%,transparent)]"
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <GlassCard level={2}>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{employee.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Employee ID</dt>
                <dd className="font-mono">{formatEmployeeId(employee.employeeCode)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">PAN (masked)</dt>
                <dd className="font-mono">{employee.pan ?? "—"}</dd>
              </div>
            </dl>
          </GlassCard>
        </TabsContent>

        <TabsContent value="employment" className="mt-4">
          <GlassCard level={2}>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Department</dt>
                <dd>{employee.departmentName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Designation</dt>
                <dd>{employee.designationTitle ?? "—"}</dd>
              </div>
            </dl>
          </GlassCard>
        </TabsContent>

        <TabsContent value="salary" className="mt-4">
          <GlassCard level={2}>
            <p className="text-sm text-muted-foreground">Annual CTC</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[var(--gold-400)]">
              {employee.ctcAnnual != null ? formatCurrency(employee.ctcAnnual) : "—"}
            </p>
          </GlassCard>
        </TabsContent>

        <TabsContent value="bank" className="mt-4">
          <GlassCard level={2}>
            <h3 className="text-sm font-semibold">Salary disbursement</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Payment method</dt>
                <dd className="font-medium">
                  {employee.salaryPaymentMethod ?? "NEFT"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bank name</dt>
                <dd>{employee.bankName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Account number</dt>
                <dd className="font-mono">{employee.bankAccount ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">IFSC</dt>
                <dd className="font-mono">{employee.ifsc ?? "—"}</dd>
              </div>
            </dl>
            {canWrite ? (
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={() => setRevealBank((v) => !v)}
              >
                {revealBank ? "Mask bank details" : "Reveal full bank / IFSC"}
              </Button>
            ) : null}
          </GlassCard>
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <GlassCard level={2}>
            <p className="text-sm text-muted-foreground">
              Onboarding documents are visible to the employee in their portal (Document center).
              PDF, JPEG, or PNG up to 15 MB.
            </p>
            {canWrite ? (
              <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="onb-type">Document type</Label>
                  <select
                    id="onb-type"
                    className="flex h-10 w-full max-w-md rounded-lg border border-border bg-background px-3 text-sm"
                    value={onboardingDocType}
                    onChange={(e) =>
                      setOnboardingDocType(e.target.value as EmployeeOnboardingDocumentType)
                    }
                  >
                    {EMPLOYEE_ONBOARDING_DOCUMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="onb-file">File</Label>
                  <Input
                    id="onb-file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    onChange={(e) => setOnboardingFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <Button
                  type="button"
                  disabled={!onboardingFile || uploadOnboardingMut.isPending}
                  onClick={() => uploadOnboardingMut.mutate()}
                >
                  Upload
                </Button>
              </div>
            ) : null}
          </GlassCard>
          <GlassCard level={2} header={<h3 className="text-sm font-semibold">Uploaded files</h3>}>
            {onboardingDocsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : onboardingDocsQuery.error ? (
              <p className="text-sm text-destructive">{(onboardingDocsQuery.error as Error).message}</p>
            ) : !onboardingDocsQuery.data?.length ? (
              <p className="text-sm text-muted-foreground">No onboarding documents yet.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {onboardingDocsQuery.data.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {labelForEmployeeOnboardingDocumentType(row.documentType)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{row.originalFilename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(row.sizeBytes)} · {formatDate(row.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void downloadEmployeeOnboardingDocument(
                            token!,
                            id,
                            row.id,
                            row.originalFilename
                          ).catch((e) => {
                            if (e instanceof ApiError) toast.error(e.message);
                            else toast.error("Download failed");
                          });
                        }}
                      >
                        Download
                      </Button>
                      {canWrite ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-[var(--danger-text)]"
                          disabled={deleteOnboardingMut.isPending}
                          onClick={() => {
                            if (!window.confirm(`Remove ${row.originalFilename}?`)) return;
                            deleteOnboardingMut.mutate(row.id);
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <GlassCard level={2}>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between border-b border-border pb-2">
                <span>Joined company</span>
                <span className="text-muted-foreground">{formatDate(employee.dateOfJoining)}</span>
              </li>
            </ul>
          </GlassCard>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
