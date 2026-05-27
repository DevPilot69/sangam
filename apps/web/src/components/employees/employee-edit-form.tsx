"use client";

import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { BankSalaryFields } from "@/components/employees/bank-salary-fields";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildUpdateEmployeeBody,
  type EmployeeFormValues,
} from "@/lib/employees/form";
import type { ApiEmploymentStatus } from "@/lib/api/employees";
import type { OrgDepartment, OrgDesignation } from "./employee-onboarding-wizard";

const SELECT_CLASS =
  "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Props = {
  initialValues: EmployeeFormValues;
  departments: OrgDepartment[];
  designations: OrgDesignation[];
  onSave: (payload: {
    profile: Record<string, unknown>;
    bank?: Record<string, unknown>;
  }) => Promise<void>;
  saving?: boolean;
  includeBankFields?: boolean;
};

export function EmployeeEditForm({
  initialValues,
  departments,
  designations,
  onSave,
  saving = false,
  includeBankFields = true,
}: Props) {
  const [values, setValues] = useState<EmployeeFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  function update<K extends keyof EmployeeFormValues>(key: K, val: EmployeeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  return (
    <GlassCard level={2} header={<h2 className="text-sm font-semibold">Edit employee</h2>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>First name</Label>
          <Input value={values.firstName} onChange={(e) => update("firstName", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Last name</Label>
          <Input value={values.lastName} onChange={(e) => update("lastName", e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Work email</Label>
          <Input
            type="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Employee code</Label>
          <Input
            value={values.employeeCode}
            onChange={(e) => update("employeeCode", e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label>Date of joining</Label>
          <Input
            type="date"
            value={values.dateOfJoining}
            onChange={(e) => update("dateOfJoining", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
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
        <div className="space-y-2 sm:col-span-2">
          <Label>Annual CTC (INR)</Label>
          <Input
            inputMode="decimal"
            value={values.ctcAnnual}
            onChange={(e) => update("ctcAnnual", e.target.value)}
            className="font-mono tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label>PAN</Label>
          <Input
            value={values.pan}
            onChange={(e) => update("pan", e.target.value.toUpperCase())}
            maxLength={10}
            className="font-mono uppercase"
          />
        </div>
        {includeBankFields ? (
          <div className="sm:col-span-2">
            <BankSalaryFields
              idPrefix="edit"
              values={{
                bankName: values.bankName,
                bankAccount: values.bankAccount,
                ifsc: values.ifsc,
                salaryPaymentMethod: values.salaryPaymentMethod,
              }}
              onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Leave account blank to keep existing masked values unless you enter new digits.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          disabled={saving}
          onClick={() => void onSave(buildUpdateEmployeeBody(values, { includeBank: includeBankFields }))}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save changes
        </Button>
      </div>
    </GlassCard>
  );
}
