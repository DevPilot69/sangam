/**
 * Salary payment method utilities — ported from
 * src/shared/banking/salary-payment-method.ts (NestJS).
 *
 * Defines the salary disbursement methods supported (NEFT/RTGS/IMPS/CHEQUE/CASH),
 * labels, normalization, and IFSC -> bank-name hints used across the payroll
 * validation pipeline.
 */
export const SALARY_PAYMENT_METHODS = [
  "NEFT",
  "RTGS",
  "IMPS",
  "CHEQUE",
  "CASH",
] as const;

export type SalaryPaymentMethod = (typeof SALARY_PAYMENT_METHODS)[number];

export const SALARY_PAYMENT_METHOD_LABELS: Record<
  SalaryPaymentMethod,
  { label: string; description: string }
> = {
  NEFT: {
    label: "NEFT",
    description:
      "National Electronic Funds Transfer — standard for salary (T+0/T+1)",
  },
  RTGS: {
    label: "RTGS",
    description:
      "Real Time Gross Settlement — high-value, same-day (₹2 lakh+ typically)",
  },
  IMPS: {
    label: "IMPS",
    description: "Immediate Payment Service — instant transfer 24×7",
  },
  CHEQUE: {
    label: "Cheque",
    description: "Physical cheque issued to employee",
  },
  CASH: {
    label: "Cash",
    description: "Cash payment (no bank transfer)",
  },
};

export function isSalaryPaymentMethod(v: string): v is SalaryPaymentMethod {
  return (SALARY_PAYMENT_METHODS as readonly string[]).includes(v);
}

export function normalizeSalaryPaymentMethod(
  v: string | null | undefined,
): SalaryPaymentMethod {
  const u = v?.toUpperCase().trim();
  if (u && isSalaryPaymentMethod(u)) return u;
  return "NEFT";
}

const IFSC_BANK_HINTS: Record<string, string> = {
  HDFC: "HDFC Bank",
  ICIC: "ICICI Bank",
  SBIN: "State Bank of India",
  UTIB: "Axis Bank",
  KKBK: "Kotak Mahindra Bank",
  PUNB: "Punjab National Bank",
  BARb: "Bank of Baroda",
  BARB: "Bank of Baroda",
  IDIB: "Indian Bank",
  IOBA: "Indian Overseas Bank",
  CNRB: "Canara Bank",
  UBIN: "Union Bank of India",
  YESB: "Yes Bank",
  INDB: "IndusInd Bank",
  FDRL: "Federal Bank",
  RATN: "RBL Bank",
  HSBC: "HSBC Bank",
  CITI: "Citibank",
  DEUT: "Deutsche Bank",
  PYTM: "Paytm Payments Bank",
  AIRP: "Airtel Payments Bank",
};

export function suggestBankNameFromIfsc(
  ifsc: string | null | undefined,
): string | null {
  if (!ifsc || ifsc.length < 4) return null;
  const code = ifsc.slice(0, 4).toUpperCase();
  return IFSC_BANK_HINTS[code] ?? null;
}
