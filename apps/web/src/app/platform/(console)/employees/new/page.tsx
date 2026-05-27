"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EmployeeCredentialsDialog } from "@/components/employees/employee-credentials-dialog";
import { EmployeeOnboardingWizard } from "@/components/employees/employee-onboarding-wizard";
import { buttonVariants } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  createPlatformTenantEmployee,
  fetchPlatformTenantDepartments,
  fetchPlatformTenantDesignations,
} from "@/lib/api/platform-employees";
import type { EmployeePortalCredentials } from "@/lib/api/employees";
import { fetchPlatformTenants } from "@/lib/api/platform";
import { usePlatformAuthStore } from "@/lib/platform/auth-store";

export default function PlatformNewEmployeePage() {
  const token = usePlatformAuthStore((s) => s.token);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";
  const qc = useQueryClient();

  const [credentials, setCredentials] = useState<EmployeePortalCredentials | null>(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [createdEmployeeId, setCreatedEmployeeId] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState("");

  const tenantsQuery = useQuery({
    queryKey: ["platform", "tenants", token],
    queryFn: () => fetchPlatformTenants(token!),
    enabled: !!token,
  });

  const tenant = tenantsQuery.data?.find((t) => t.id === tenantId);

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

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      createPlatformTenantEmployee(token!, tenantId, body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["platform"] });
      if (data.portalCredentials) {
        setCredentials(data.portalCredentials);
        setCreatedEmployeeId(data.id);
        setCreatedName(`${data.firstName} ${data.lastName}`);
        setCredentialsOpen(true);
      } else {
        toast.success("Employee created");
        router.push(`/platform/employees/${data.id}?tenantId=${tenantId}`);
      }
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else if (e instanceof Error) toast.error(e.message);
      else toast.error("Could not create employee");
    },
  });

  if (!tenantId) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">Select a tenant from the employees list first.</p>
        <Link href="/platform/employees" className={buttonVariants({ className: "mt-4" })}>
          Back to employees
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/platform/employees?tenantId=${encodeURIComponent(tenantId)}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Employees
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">
          Onboard employee
        </h1>
        <p className="text-sm text-muted-foreground">
          {tenant?.name ?? "Organization"}
          {tenant?.companyCode ? (
            <>
              {" "}
              · Company code <span className="font-mono">{tenant.companyCode}</span>
            </>
          ) : null}
        </p>
      </div>

      <EmployeeOnboardingWizard
        departments={depts.data ?? []}
        designations={desigs.data ?? []}
        submitting={createMut.isPending}
        onCancel={() => router.push(`/platform/employees?tenantId=${tenantId}`)}
        onSubmit={async (body) => {
          await createMut.mutateAsync(body);
        }}
      />

      <EmployeeCredentialsDialog
        open={credentialsOpen}
        onOpenChange={setCredentialsOpen}
        credentials={credentials}
        employeeName={createdName}
        onDone={() => {
          if (createdEmployeeId) {
            router.push(`/platform/employees/${createdEmployeeId}?tenantId=${tenantId}`);
          }
        }}
      />
    </div>
  );
}
