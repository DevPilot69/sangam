"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EmployeeCredentialsDialog } from "@/components/employees/employee-credentials-dialog";
import { EmployeeOnboardingWizard } from "@/components/employees/employee-onboarding-wizard";
import { buttonVariants } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { createEmployee } from "@/lib/api/employees";
import type { EmployeePortalCredentials } from "@/lib/api/employees";
import { fetchDepartments, fetchDesignations } from "@/lib/api/tenant";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function NewEmployeePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const [credentials, setCredentials] = useState<EmployeePortalCredentials | null>(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [createdEmployeeId, setCreatedEmployeeId] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState("");

  const depts = useQuery({
    queryKey: ["tenant", "departments", token],
    enabled: Boolean(token),
    queryFn: () => fetchDepartments(token!),
  });
  const desigs = useQuery({
    queryKey: ["tenant", "designations", token],
    enabled: Boolean(token),
    queryFn: () => fetchDesignations(token!),
  });

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => createEmployee(token!, body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["employees"] });
      if (data.portalCredentials) {
        setCredentials(data.portalCredentials);
        setCreatedEmployeeId(data.id);
        setCreatedName(`${data.firstName} ${data.lastName}`);
        setCredentialsOpen(true);
      } else {
        toast.success("Employee created");
        router.push(`/employees/${data.id}`);
      }
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else if (e instanceof Error) toast.error(e.message);
      else toast.error("Could not create employee");
    },
  });

  if (!token) {
    return (
      <GlassCard level={2}>
        <p className="text-sm text-muted-foreground">Sign in to add employees.</p>
        <Link href="/login" className={buttonVariants({ className: "mt-4" })}>
          Sign in
        </Link>
      </GlassCard>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/employees" className="text-sm text-muted-foreground hover:underline">
          ← Employees
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">
          Onboard employee
        </h1>
        <p className="text-sm text-muted-foreground">
          Portal login is created automatically (username: company code + employee ID).
        </p>
      </div>

      <EmployeeOnboardingWizard
        departments={depts.data ?? []}
        designations={desigs.data ?? []}
        submitting={createMut.isPending}
        onCancel={() => router.push("/employees")}
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
          if (createdEmployeeId) router.push(`/employees/${createdEmployeeId}`);
        }}
      />
    </div>
  );
}
