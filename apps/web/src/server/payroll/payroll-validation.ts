/**
 * Payroll validation utilities — ported from
 * src/modules/payroll/payroll-validation.util.ts (NestJS).
 *
 * Pure functions over PayrollEmployeeCandidate. No DB access.
 */
export type PayrollIssueSeverity = "blocking" | "warning";

export type PayrollEmployeeIssue = {
  code: string;
  severity: PayrollIssueSeverity;
  message: string;
  field?: string;
};

export type PayrollEmployeeCandidate = {
  id: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  status: string;
  pan: string | null;
  bankName: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  salaryPaymentMethod: string;
  ctcAnnual: number | null;
  hasSalaryAssignment: boolean;
};

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/i;

export function isValidIfsc(ifsc: string | null | undefined): boolean {
  if (!ifsc?.trim()) return false;
  return IFSC_RE.test(ifsc.trim());
}

export function requiresBankTransferForSalary(
  method: string | null | undefined,
): boolean {
  const m = method?.toUpperCase();
  return m !== "CASH" && m !== "CHEQUE";
}

export function hasValidBankAccount(
  account: string | null | undefined,
): boolean {
  if (!account?.trim()) return false;
  const digits = account.replace(/\s/g, "");
  return digits.length >= 9 && digits.length <= 18 && /^\d+$/.test(digits);
}

export function assessEmployeePayrollIssues(
  emp: PayrollEmployeeCandidate,
): PayrollEmployeeIssue[] {
  const issues: PayrollEmployeeIssue[] = [];

  if (emp.status !== "ACTIVE") {
    issues.push({
      code: "EMPLOYEE_INACTIVE",
      severity: "blocking",
      message: "Employee is not active",
      field: "status",
    });
  }

  const needsBank = requiresBankTransferForSalary(emp.salaryPaymentMethod);

  if (needsBank) {
    if (!hasValidBankAccount(emp.bankAccount)) {
      issues.push({
        code: "MISSING_BANK_ACCOUNT",
        severity: "blocking",
        message: "Bank account number is missing or invalid",
        field: "bankAccount",
      });
    }

    if (!isValidIfsc(emp.ifsc)) {
      issues.push({
        code: "MISSING_IFSC",
        severity: "blocking",
        message: "IFSC is missing or invalid — cannot disburse salary",
        field: "ifsc",
      });
    }

    if (!emp.bankName?.trim()) {
      issues.push({
        code: "MISSING_BANK_NAME",
        severity: "blocking",
        message: "Bank name is required for salary disbursement",
        field: "bankName",
      });
    }
  } else {
    issues.push({
      code: "NON_BANK_PAYMENT",
      severity: "warning",
      message: `Salary payment method is ${emp.salaryPaymentMethod} — bank transfer not used`,
      field: "salaryPaymentMethod",
    });
  }

  if (!emp.ctcAnnual && !emp.hasSalaryAssignment) {
    issues.push({
      code: "MISSING_SALARY",
      severity: "blocking",
      message: "No CTC or salary structure assigned",
      field: "ctcAnnual",
    });
  }

  if (!emp.pan?.trim()) {
    issues.push({
      code: "MISSING_PAN",
      severity: "warning",
      message: "PAN not on file (TDS reporting may be incomplete)",
      field: "pan",
    });
  }

  return issues;
}

export function hasBlockingIssues(issues: PayrollEmployeeIssue[]): boolean {
  return issues.some((i) => i.severity === "blocking");
}

export function defaultExcludedIds(
  employees: { id: string; issues: PayrollEmployeeIssue[] }[],
): string[] {
  return employees
    .filter((e) => hasBlockingIssues(e.issues))
    .map((e) => e.id);
}

export function estimateMonthlyGross(ctcAnnual: number | null): number {
  if (!ctcAnnual || ctcAnnual <= 0) return 0;
  return Math.round(ctcAnnual / 12);
}

export function estimateDeductions(gross: number): number {
  return Math.round(gross * 0.18);
}

export function estimateNet(gross: number, deductions: number): number {
  return Math.max(0, gross - deductions);
}
