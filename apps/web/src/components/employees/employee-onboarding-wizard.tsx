"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stepper } from "@/components/ui/stepper";
import { BankSalaryFields } from "@/components/employees/bank-salary-fields";
import {
  buildCreateEmployeeBody,
  defaultEmployeeFormValues,
  EMPLOYEE_ONBOARDING_STEPS,
  type EmployeeFormValues,
} from "@/lib/employees/form";
import { paymentMethodLabel } from "@/lib/banking/payment-methods";
import type { ApiEmploymentStatus } from "@/lib/api/employees";
import { formatCurrency } from "@/lib/utils/formatters";

const SELECT_CLASS =
  "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type OrgDepartment = { id: string; name: string; code: string };
export type OrgDesignation = { id: string; title: string };

type Props = {
  departments: OrgDepartment[];
  designations: OrgDesignation[];
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
  submitting?: boolean;
  cancelHref?: string;
  onCancel?: () => void;
};

export function EmployeeOnboardingWizard({
  departments,
  designations,
  onSubmit,
  submitting = false,
  onCancel,
}: Props) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<EmployeeFormValues>(() => defaultEmployeeFormValues());

  function update<K extends keyof EmployeeFormValues>(key: K, val: EmployeeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function canAdvance(): boolean {
    if (step === 0) {
      return (
        values.firstName.trim().length >= 1 &&
        values.lastName.trim().length >= 1 &&
        values.email.includes("@")
      );
    }
    if (step === 1) return Boolean(values.dateOfJoining);
    return true;
  }

  function next() {
    if (!canAdvance()) return;
    setStep((s) => Math.min(s + 1, EMPLOYEE_ONBOARDING_STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    try {
      const body = buildCreateEmployeeBody(values);
      await onSubmit(body);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create employee";
      toast.error(message);
    }
  }

  const deptName =
    departments.find((d) => d.id === values.departmentId)?.name ?? "—";
  const desTitle =
    designations.find((d) => d.id === values.designationId)?.title ?? "—";

  return (
    <div className="space-y-6">
      <GlassCard level={2} className="p-4">
        <p className="mb-3 text-xs text-muted-foreground">
          Step {step + 1} of {EMPLOYEE_ONBOARDING_STEPS.length}
        </p>
        <Stepper steps={[...EMPLOYEE_ONBOARDING_STEPS]} current={step} />
      </GlassCard>

      <GlassCard level={3}>
        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>First name *</Label>
              <Input
                value={values.firstName}
                onChange={(e) => update("firstName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Last name *</Label>
              <Input
                value={values.lastName}
                onChange={(e) => update("lastName", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Work email *</Label>
              <Input
                type="email"
                value={values.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Employee code (optional)</Label>
              <Input
                placeholder="Auto-generated if empty"
                value={values.employeeCode}
                onChange={(e) => update("employeeCode", e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date of joining *</Label>
              <Input
                type="date"
                value={values.dateOfJoining}
                onChange={(e) => update("dateOfJoining", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Employment status</Label>
              <select
                className={SELECT_CLASS}
                value={values.status}
                onChange={(e) => update("status", e.target.value as ApiEmploymentStatus)}
              >
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On leave</option>
                <option value="NOTICE">Notice period</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <select
                className={SELECT_CLASS}
                value={values.departmentId}
                onChange={(e) => update("departmentId", e.target.value)}
              >
                <option value="">— None —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <select
                className={SELECT_CLASS}
                value={values.designationId}
                onChange={(e) => update("designationId", e.target.value)}
              >
                <option value="">— None —</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-2 max-w-md">
            <Label>Annual CTC (INR, optional)</Label>
            <Input
              inputMode="decimal"
              value={values.ctcAnnual}
              onChange={(e) => update("ctcAnnual", e.target.value)}
              className="font-mono tabular-nums"
              placeholder="e.g. 1200000"
            />
            <p className="text-xs text-muted-foreground">
              Used for payroll structure assignment later.
            </p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div className="max-w-xs space-y-2">
              <Label>PAN (optional)</Label>
              <Input
                value={values.pan}
                onChange={(e) => update("pan", e.target.value.toUpperCase())}
                maxLength={10}
                className="font-mono uppercase"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Optional for now. If you enter any bank detail, account number (9–18 digits) and a
              valid 11-character IFSC are required together.
            </p>
            <BankSalaryFields
              idPrefix="onboard"
              values={{
                bankName: values.bankName,
                bankAccount: values.bankAccount,
                ifsc: values.ifsc,
                salaryPaymentMethod: values.salaryPaymentMethod,
              }}
              onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Name", `${values.firstName} ${values.lastName}`.trim()],
              ["Email", values.email],
              ["Code", values.employeeCode || "Auto"],
              ["Joining", values.dateOfJoining],
              ["Department", deptName],
              ["Designation", desTitle],
              ["Status", values.status],
              [
                "CTC",
                values.ctcAnnual.trim()
                  ? formatCurrency(Number(values.ctcAnnual.replace(/,/g, "")))
                  : "—",
              ],
              ["PAN", values.pan || "—"],
              ["Bank", values.bankName || "—"],
              ["Account", values.bankAccount || "—"],
              ["IFSC", values.ifsc || "—"],
              ["Salary payment", paymentMethodLabel(values.salaryPaymentMethod)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </GlassCard>

      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={back} disabled={step === 0 || submitting}>
            Back
          </Button>
        </div>
        {step < EMPLOYEE_ONBOARDING_STEPS.length - 1 ? (
          <Button type="button" onClick={next} disabled={!canAdvance()}>
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={() => void submit()} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create employee"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

