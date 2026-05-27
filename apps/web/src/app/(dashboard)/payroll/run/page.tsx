"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stepper } from "@/components/ui/stepper";
import { ApiError } from "@/lib/api/client";
import {
  createPayrollRun,
  fetchPayrollPreview,
  fetchPayrollSetup,
  finalizePayrollRun,
  updatePayrollSetup,
  validatePayrollRun,
  type PayrollSetupEmployee,
  type PayrollValidationResponse,
} from "@/lib/api/payroll";
import {
  SALARY_PAYMENT_METHOD_OPTIONS,
  type SalaryPaymentMethod,
} from "@/lib/banking/payment-methods";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";

const steps = ["Setup", "Validate", "Preview", "Finalize"];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i, 1).toLocaleDateString("en-IN", { month: "long" }),
}));

function CheckIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <CheckCircle2 className="size-4 text-[var(--success-text)]" />;
  if (status === "warn") return <AlertTriangle className="size-4 text-[var(--warning-text)]" />;
  return <XCircle className="size-4 text-destructive" />;
}

export default function PayrollRunPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const now = new Date();
  const [step, setStep] = useState(0);
  const [runId, setRunId] = useState<string | null>(null);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [ackWarn, setAckWarn] = useState(false);
  const [ackReason, setAckReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [validation, setValidation] = useState<PayrollValidationResponse | null>(null);
  const [disbursementMethod, setDisbursementMethod] =
    useState<SalaryPaymentMethod>("NEFT");

  const setupQuery = useQuery({
    queryKey: ["payroll", "setup", runId, token],
    queryFn: () => fetchPayrollSetup(token!, runId!),
    enabled: !!token && !!runId,
  });

  const previewQuery = useQuery({
    queryKey: ["payroll", "preview", runId, token],
    queryFn: () => fetchPayrollPreview(token!, runId!),
    enabled: !!token && !!runId && step >= 2,
  });

  useEffect(() => {
    const m = setupQuery.data?.run.disbursementPaymentMethod;
    if (m) setDisbursementMethod(m as SalaryPaymentMethod);
  }, [setupQuery.data?.run.disbursementPaymentMethod]);

  const createMut = useMutation({
    mutationFn: () => createPayrollRun(token!, { periodYear, periodMonth }),
    onSuccess: (data) => {
      setRunId(data.run.id);
      setExcludedIds(new Set(data.run.excludedEmployeeIds));
      setDisbursementMethod(
        (data.run.disbursementPaymentMethod as SalaryPaymentMethod) ?? "NEFT"
      );
      toast.success(`Payroll setup for ${data.run.periodLabel}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not start run"),
  });

  async function persistSetup(runIdParam: string) {
    return updatePayrollSetup(token!, runIdParam, {
      excludedEmployeeIds: [...excludedIds],
      ackWarnings: ackWarn,
      ackWarningsReason: ackReason.trim() || undefined,
      disbursementPaymentMethod: disbursementMethod,
    });
  }

  const saveSetupMut = useMutation({
    mutationFn: () => persistSetup(runId!),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not save setup"),
  });

  const validateMut = useMutation({
    mutationFn: () => validatePayrollRun(token!, runId!),
    onSuccess: (v) => setValidation(v),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Validation failed"),
  });

  const finalizeMut = useMutation({
    mutationFn: () => finalizePayrollRun(token!, runId!),
    onSuccess: (run) => {
      toast.success("Payroll locked successfully");
      void qc.invalidateQueries({ queryKey: ["payroll"] });
      router.push(`/payroll/${run.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Finalize failed"),
  });

  const employees = setupQuery.data?.employees ?? [];
  const includedCount = employees.filter((e) => !excludedIds.has(e.id)).length;

  const excludedList = useMemo(
    () => employees.filter((e) => excludedIds.has(e.id)),
    [employees, excludedIds]
  );

  function toggleEmployee(emp: PayrollSetupEmployee, include: boolean) {
    if (include && !emp.canInclude) {
      toast.error(emp.issues.find((i) => i.severity === "blocking")?.message ?? "Cannot include");
      return;
    }
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (include) next.delete(emp.id);
      else next.add(emp.id);
      return next;
    });
  }

  async function goNext() {
    if (step === 0) {
      let id = runId;
      if (!id) {
        const data = await createMut.mutateAsync();
        id = data.run.id;
        setRunId(id);
        const ex = new Set(data.run.excludedEmployeeIds);
        setExcludedIds(ex);
        await persistSetup(id);
      } else {
        await persistSetup(id);
      }
      setStep(1);
      const v = await validatePayrollRun(token!, id);
      setValidation(v);
      return;
    }
    if (step === 1) {
      if (!validation?.canProceed) {
        toast.error("Resolve blocking issues before continuing");
        return;
      }
      if (validation.requiresWarningAck && !ackWarn) {
        toast.error("Acknowledge warnings to continue");
        return;
      }
      await saveSetupMut.mutateAsync();
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
    }
  }

  function lock() {
    if (confirmText !== "CONFIRM") {
      toast.error("Type CONFIRM to finalize");
      return;
    }
    finalizeMut.mutate();
  }

  const busy =
    createMut.isPending ||
    saveSetupMut.isPending ||
    validateMut.isPending ||
    finalizeMut.isPending;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Payroll run</h1>
          <p className="text-sm text-muted-foreground">
            Exclude employees for this cycle, fix validation blockers, then lock payroll.
          </p>
        </div>
        <Link href="/payroll" className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>

      <Stepper steps={steps} current={step} />

      {step === 0 ? (
        <GlassCard level={2} header={<h2 className="font-semibold">Setup — pay period & inclusion</h2>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="periodYear">Year</Label>
              <Input
                id="periodYear"
                type="number"
                min={2020}
                max={2100}
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
                disabled={!!runId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodMonth">Month</Label>
              <select
                id="periodMonth"
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(Number(e.target.value))}
                disabled={!!runId}
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {setupQuery.isLoading && runId ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading employees…</p>
          ) : null}

          <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
            <Label htmlFor="runPaymentMethod">Default salary payment method (this run)</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Used for the bank file when an employee has no individual method set. Most organizations
              use NEFT for monthly salary.
            </p>
            <select
              id="runPaymentMethod"
              className="mt-2 flex h-10 w-full max-w-md rounded-md border border-border bg-background px-3 text-sm"
              value={disbursementMethod}
              onChange={(e) =>
                setDisbursementMethod(e.target.value as SalaryPaymentMethod)
              }
            >
              {SALARY_PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.description}
                </option>
              ))}
            </select>
          </div>

          {employees.length > 0 ? (
            <>
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{includedCount}</span> included
                · <span className="font-mono">{excludedIds.size}</span> excluded
                {setupQuery.data?.summary.blockingExcluded ? (
                  <> · {setupQuery.data.summary.blockingExcluded} auto-excluded (validation failed)</>
                ) : null}
              </p>
              <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-border bg-muted/80 backdrop-blur">
                    <tr>
                      <th className="px-3 py-2 text-left">Include</th>
                      <th className="px-3 py-2 text-left">Employee</th>
                      <th className="px-3 py-2 text-left">Bank / payment</th>
                      <th className="px-3 py-2 text-left">Issues</th>
                      <th className="px-3 py-2 text-right">Est. net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const included = !excludedIds.has(emp.id);
                      return (
                        <tr
                          key={emp.id}
                          className={cn(
                            "border-b border-border/60",
                            !emp.canInclude && "bg-destructive/5"
                          )}
                        >
                          <td className="px-3 py-2">
                            <Checkbox
                              checked={included}
                              disabled={!emp.canInclude && !included}
                              onCheckedChange={(c) => toggleEmployee(emp, c === true)}
                              aria-label={`Include ${emp.employeeName}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-medium">{emp.employeeName}</span>
                            <span className="ml-1 font-mono text-xs text-muted-foreground">
                              {emp.employeeCode}
                            </span>
                          </td>
                          <td className="max-w-[10rem] px-3 py-2 text-xs">
                            {emp.disbursement.requiresBankTransfer ? (
                              <div className="space-y-0.5">
                                <p className="font-medium">{emp.disbursement.paymentMethodLabel}</p>
                                <p className="text-muted-foreground truncate">
                                  {emp.disbursement.bankName ?? "—"}
                                </p>
                                <p className="font-mono text-muted-foreground">
                                  {emp.disbursement.bankAccount
                                    ? `•••${emp.disbursement.bankAccount.slice(-4)}`
                                    : "—"}{" "}
                                  · {emp.disbursement.ifsc ?? "—"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                {emp.disbursement.paymentMethodLabel} (no bank transfer)
                              </span>
                            )}
                          </td>
                          <td className="max-w-xs px-3 py-2">
                            {emp.issues.length === 0 ? (
                              <span className="text-xs text-[var(--success-text)]">Ready</span>
                            ) : (
                              <ul className="space-y-0.5 text-xs">
                                {emp.issues.map((issue) => (
                                  <li
                                    key={issue.code}
                                    className={
                                      issue.severity === "blocking"
                                        ? "text-destructive"
                                        : "text-[var(--warning-text)]"
                                    }
                                  >
                                    {issue.message}
                                    {issue.severity === "blocking" ? (
                                      <>
                                        {" "}
                                        <Link
                                          href={emp.fixHref}
                                          className="underline"
                                        >
                                          Fix
                                        </Link>
                                      </>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            {included
                              ? formatCurrency(emp.monthlyNetEstimate)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : runId ? (
            <p className="mt-4 text-sm text-muted-foreground">No active employees found.</p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Choose period and continue to load employees for this payroll cycle.
            </p>
          )}
        </GlassCard>
      ) : null}

      {step === 1 ? (
        <GlassCard level={2} header={<h2 className="font-semibold">Pre-payroll validation</h2>}>
          {validateMut.isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Running checks…
            </div>
          ) : validation ? (
            <>
              <ul className="space-y-3 text-sm">
                {validation.checks.map((check) => (
                  <li key={check.id} className="flex gap-2">
                    <CheckIcon status={check.status} />
                    <div>
                      <p className="font-medium">{check.label}</p>
                      <p className="text-muted-foreground">{check.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {validation.blockingEmployees.length > 0 ? (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium text-destructive">Still included with blocking issues</p>
                  <ul className="mt-2 list-inside list-disc text-muted-foreground">
                    {validation.blockingEmployees.map((e) => (
                      <li key={e.id}>
                        {e.employeeName} ({e.employeeCode})
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs">Exclude them on the Setup step or update employee records.</p>
                </div>
              ) : null}
              {validation.requiresWarningAck ? (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="ack"
                      checked={ackWarn}
                      onCheckedChange={(c) => setAckWarn(c === true)}
                    />
                    <Label htmlFor="ack" className="font-normal text-muted-foreground">
                      Proceed with warnings acknowledged
                    </Label>
                  </div>
                  <Input
                    placeholder="Optional note for audit"
                    value={ackReason}
                    onChange={(e) => setAckReason(e.target.value)}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => validateMut.mutate()}>
              Run validation
            </Button>
          )}
          {excludedList.length > 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Excluded this cycle: {excludedList.map((e) => e.employeeName).join(", ")}
            </p>
          ) : null}
        </GlassCard>
      ) : null}

      {step === 2 ? (
        <GlassCard level={2} header={<h2 className="font-semibold">Preview</h2>}>
          {previewQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Building preview…
            </div>
          ) : previewQuery.error ? (
            <p className="text-sm text-destructive">{(previewQuery.error as Error).message}</p>
          ) : previewQuery.data ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {previewQuery.data.entries.length} employees · {previewQuery.data.excludedCount}{" "}
                excluded · Default rail:{" "}
                <span className="font-medium text-foreground">
                  {previewQuery.data.disbursement.defaultPaymentMethodLabel}
                </span>
              </p>

              <GlassCard level={1} className="mb-4 !p-4">
                <h3 className="text-sm font-semibold">Salary disbursement file</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bank transfer details for included employees ({previewQuery.data.disbursement.bankTransferCount}{" "}
                  via bank). Export the bank disbursement report after lock for your corporate banking portal.
                </p>
              </GlassCard>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2">Employee</th>
                      <th className="px-3 py-2">Payment</th>
                      <th className="px-3 py-2">Bank name</th>
                      <th className="px-3 py-2">Account number</th>
                      <th className="px-3 py-2">IFSC</th>
                      <th className="px-3 py-2 text-right">Gross</th>
                      <th className="px-3 py-2 text-right">Deductions</th>
                      <th className="px-3 py-2 text-right">Net pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewQuery.data.entries.map((e) => (
                      <tr key={e.employeeId} className="border-b border-border/60">
                        <td className="px-3 py-2">
                          {e.employeeName}
                          <span className="ml-1 text-xs text-muted-foreground">{e.employeeCode}</span>
                        </td>
                        <td className="px-3 py-2 font-medium">{e.paymentMethodLabel}</td>
                        <td className="px-3 py-2">{e.bankName ?? "—"}</td>
                        <td className="px-3 py-2 font-mono">{e.bankAccount ?? "—"}</td>
                        <td className="px-3 py-2 font-mono uppercase">{e.ifsc ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(e.gross)}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(e.deductions)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[var(--accent-400)]">
                          {formatCurrency(e.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-right font-mono text-sm">
                Total net:{" "}
                <span className="text-foreground">
                  {formatCurrency(previewQuery.data.totals.net)}
                </span>
              </p>
            </>
          ) : null}
        </GlassCard>
      ) : null}

      {step === 3 ? (
        <GlassCard level={2} header={<h2 className="font-semibold">Finalize</h2>}>
          <p className="text-sm text-muted-foreground">
            You are about to lock payroll for {includedCount} employees (
            {setupQuery.data?.run.periodLabel ?? "selected period"}). This creates immutable payroll
            entries.
          </p>
          <div className="mt-4 space-y-2">
            <Label htmlFor="confirm">Type CONFIRM</Label>
            <Input id="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </div>
          <Button
            type="button"
            className="mt-6 w-full shadow-[var(--shadow-brand)]"
            disabled={finalizeMut.isPending}
            onClick={lock}
          >
            {finalizeMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Lock payroll"}
          </Button>
        </GlassCard>
      ) : null}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="secondary"
          disabled={step === 0 || busy}
          onClick={() => {
            if (step === 1) setValidation(null);
            setStep((s) => s - 1);
          }}
        >
          Back
        </Button>
        {step < 3 ? (
          <Button type="button" disabled={busy} onClick={() => void goNext()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
