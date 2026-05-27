"use client";

import { useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SALARY_PAYMENT_METHOD_OPTIONS,
  suggestBankNameFromIfsc,
  type SalaryPaymentMethod,
} from "@/lib/banking/payment-methods";

export type BankSalaryFieldValues = {
  bankName: string;
  bankAccount: string;
  ifsc: string;
  salaryPaymentMethod: SalaryPaymentMethod;
};

type Props = {
  values: BankSalaryFieldValues;
  onChange: (patch: Partial<BankSalaryFieldValues>) => void;
  /** When true, empty bank name is auto-filled from IFSC prefix */
  suggestBankFromIfsc?: boolean;
  idPrefix?: string;
  /** Company = tenant payroll debit account; employee = individual salary account */
  mode?: "employee" | "company";
  disabled?: boolean;
};

export function BankSalaryFields({
  values,
  onChange,
  suggestBankFromIfsc = true,
  idPrefix = "bank",
  mode = "employee",
  disabled = false,
}: Props) {
  useEffect(() => {
    if (!suggestBankFromIfsc || values.bankName.trim()) return;
    const hint = suggestBankNameFromIfsc(values.ifsc);
    if (hint) onChange({ bankName: hint });
  }, [values.ifsc, values.bankName, suggestBankFromIfsc, onChange]);

  const selectedMethod = SALARY_PAYMENT_METHOD_OPTIONS.find(
    (o) => o.value === values.salaryPaymentMethod
  );

  const intro =
    mode === "company" ? (
      <p className="text-sm text-muted-foreground">
        Company account used to debit payroll and disburse salaries. Most organizations use{" "}
        <strong className="text-foreground">NEFT</strong> for monthly salary files to the bank.
      </p>
    ) : (
      <p className="text-sm text-muted-foreground">
        Salary is typically paid via <strong className="text-foreground">NEFT</strong> to the
        employee&apos;s bank account. RTGS and IMPS are available for special cases; cheque or cash
        when no electronic transfer is used.
      </p>
    );

  return (
    <div className="space-y-4">
      {intro}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-payment-method`}>Salary payment method</Label>
        <select
          id={`${idPrefix}-payment-method`}
          className="flex h-10 w-full max-w-md rounded-md border border-border bg-background px-3 text-sm"
          value={values.salaryPaymentMethod}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              salaryPaymentMethod: e.target.value as SalaryPaymentMethod,
            })
          }
        >
          {SALARY_PAYMENT_METHOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {selectedMethod ? (
          <p className="text-xs text-muted-foreground">{selectedMethod.description}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-bank-name`}>Bank name</Label>
          <Input
            id={`${idPrefix}-bank-name`}
            value={values.bankName}
            onChange={(e) => onChange({ bankName: e.target.value })}
            placeholder="e.g. HDFC Bank, State Bank of India"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-ifsc`}>IFSC code</Label>
          <Input
            id={`${idPrefix}-ifsc`}
            value={values.ifsc}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
            }
            maxLength={11}
            className="font-mono uppercase"
            placeholder="e.g. HDFC0001234"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-account`}>
            {mode === "company" ? "Bank account number" : "Account number"}
          </Label>
          <Input
            id={`${idPrefix}-account`}
            inputMode="numeric"
            value={values.bankAccount}
            disabled={disabled}
            onChange={(e) => onChange({ bankAccount: e.target.value.replace(/\D/g, "") })}
            className="font-mono"
            placeholder="9–18 digits"
          />
        </div>
      </div>
    </div>
  );
}
