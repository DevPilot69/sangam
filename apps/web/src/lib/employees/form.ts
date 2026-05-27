import type { ApiEmployeeDetail, ApiEmploymentStatus } from "@/lib/api/employees";
import type { SalaryPaymentMethod } from "@/lib/banking/payment-methods";

export type EmployeeFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  employeeCode: string;
  dateOfJoining: string;
  departmentId: string;
  designationId: string;
  status: ApiEmploymentStatus;
  ctcAnnual: string;
  pan: string;
  bankName: string;
  bankAccount: string;
  ifsc: string;
  salaryPaymentMethod: SalaryPaymentMethod;
};

export const EMPLOYEE_ONBOARDING_STEPS = [
  "Personal",
  "Employment",
  "Compensation",
  "Bank & tax",
  "Review",
] as const;

export const defaultEmployeeFormValues = (): EmployeeFormValues => ({
  firstName: "",
  lastName: "",
  email: "",
  employeeCode: "",
  dateOfJoining: new Date().toISOString().slice(0, 10),
  departmentId: "",
  designationId: "",
  status: "ACTIVE",
  ctcAnnual: "",
  pan: "",
  bankName: "",
  bankAccount: "",
  ifsc: "",
  salaryPaymentMethod: "NEFT",
});

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const BANK_ACCOUNT_PATTERN = /^[0-9]{9,18}$/;

function normalizePan(pan: string): string {
  return pan.replace(/\s/g, "").toUpperCase();
}

function normalizeIfsc(ifsc: string): string {
  return ifsc.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function normalizeBankDigits(account: string): string {
  return account.replace(/\D/g, "");
}

/** Returns a user-facing message, or null if the form can be submitted. */
export function validateEmployeeFormForSubmit(values: EmployeeFormValues): string | null {
  const panNorm = normalizePan(values.pan);
  if (panNorm && !PAN_PATTERN.test(panNorm)) {
    return "PAN must be 10 characters (e.g. ABCDE1234F), or leave it blank.";
  }

  const bankName = values.bankName.trim();
  const bankDigits = normalizeBankDigits(values.bankAccount);
  const ifscNorm = normalizeIfsc(values.ifsc);
  const anyBank = Boolean(bankName || bankDigits || ifscNorm);

  if (!anyBank) return null;

  if (!bankDigits || !BANK_ACCOUNT_PATTERN.test(bankDigits)) {
    return "Bank account must be 9–18 digits, or leave all bank fields blank for now.";
  }
  if (!ifscNorm || !IFSC_PATTERN.test(ifscNorm)) {
    return "IFSC must be 11 characters (e.g. HDFC0001234), or leave all bank fields blank for now.";
  }

  return null;
}

export function employeeToFormValues(e: ApiEmployeeDetail): EmployeeFormValues {
  return {
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    employeeCode: e.employeeCode,
    dateOfJoining: e.dateOfJoining,
    departmentId: e.departmentId ?? "",
    designationId: e.designationId ?? "",
    status: e.status,
    ctcAnnual: e.ctcAnnual != null ? String(e.ctcAnnual) : "",
    pan: e.pan?.replace(/\*/g, "") === e.pan ? e.pan ?? "" : "",
    bankName: e.bankName ?? "",
    bankAccount: e.bankAccount?.startsWith("*") ? "" : e.bankAccount ?? "",
    ifsc: e.ifsc?.startsWith("*") ? "" : e.ifsc ?? "",
    salaryPaymentMethod: (e.salaryPaymentMethod as SalaryPaymentMethod) ?? "NEFT",
  };
}

export function buildCreateEmployeeBody(values: EmployeeFormValues): Record<string, unknown> {
  const validationError = validateEmployeeFormForSubmit(values);
  if (validationError) throw new Error(validationError);

  const code = values.employeeCode.trim();
  if (code) {
    const ok = /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(code);
    if (!ok || code.length > 32) {
      throw new Error(
        "Employee code must start with a letter or number, be at most 32 characters, and only use letters, numbers, hyphens, or underscores."
      );
    }
  }

  const body: Record<string, unknown> = {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim().toLowerCase(),
    dateOfJoining: values.dateOfJoining,
    status: values.status,
  };
  if (code) body.employeeCode = code;
  if (values.departmentId) body.departmentId = values.departmentId;
  if (values.designationId) body.designationId = values.designationId;
  if (values.ctcAnnual.trim()) {
    const n = Number(values.ctcAnnual.replace(/,/g, ""));
    if (!Number.isNaN(n) && n >= 0) body.ctcAnnual = n;
  }
  const panNorm = normalizePan(values.pan);
  if (panNorm && PAN_PATTERN.test(panNorm)) body.pan = panNorm;

  const bankName = values.bankName.trim();
  const bankDigits = normalizeBankDigits(values.bankAccount);
  const ifscNorm = normalizeIfsc(values.ifsc);
  const bankComplete =
    bankDigits &&
    BANK_ACCOUNT_PATTERN.test(bankDigits) &&
    ifscNorm &&
    IFSC_PATTERN.test(ifscNorm);

  if (bankComplete) {
    if (bankName) body.bankName = bankName;
    body.bankAccount = bankDigits;
    body.ifsc = ifscNorm;
  }
  body.salaryPaymentMethod = values.salaryPaymentMethod;
  return body;
}

export function buildUpdateEmployeeBody(
  values: EmployeeFormValues,
  opts?: { includeBank?: boolean }
): { profile: Record<string, unknown>; bank?: Record<string, unknown> } {
  const profile: Record<string, unknown> = {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim().toLowerCase(),
    dateOfJoining: values.dateOfJoining,
    status: values.status,
    departmentId: values.departmentId || null,
    designationId: values.designationId || null,
  };
  const code = values.employeeCode.trim();
  if (code) profile.employeeCode = code;
  if (values.ctcAnnual.trim()) {
    const n = Number(values.ctcAnnual.replace(/,/g, ""));
    profile.ctcAnnual = !Number.isNaN(n) && n >= 0 ? n : null;
  } else {
    profile.ctcAnnual = null;
  }
  const panNorm = values.pan.replace(/\s/g, "").toUpperCase();
  profile.pan = panNorm || null;

  let bank: Record<string, unknown> | undefined;
  if (opts?.includeBank) {
    bank = {};
    const bankDigits = values.bankAccount.replace(/\D/g, "");
    bank.bankName = values.bankName.trim() || null;
    bank.bankAccount = bankDigits || null;
    const ifscNorm = values.ifsc.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    bank.ifsc = ifscNorm || null;
    bank.salaryPaymentMethod = values.salaryPaymentMethod;
  }

  return { profile, bank };
}
