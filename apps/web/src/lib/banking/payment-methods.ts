export const SALARY_PAYMENT_METHODS = [
  "NEFT",
  "RTGS",
  "IMPS",
  "CHEQUE",
  "CASH",
] as const;

export type SalaryPaymentMethod = (typeof SALARY_PAYMENT_METHODS)[number];

export const SALARY_PAYMENT_METHOD_OPTIONS: {
  value: SalaryPaymentMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "NEFT",
    label: "NEFT",
    description: "Standard salary transfer (batch-friendly)",
  },
  {
    value: "RTGS",
    label: "RTGS",
    description: "High-value, real-time gross settlement",
  },
  {
    value: "IMPS",
    label: "IMPS",
    description: "Instant transfer, 24×7",
  },
  {
    value: "CHEQUE",
    label: "Cheque",
    description: "Salary paid by cheque",
  },
  {
    value: "CASH",
    label: "Cash",
    description: "Cash disbursement (no bank transfer)",
  },
];

const IFSC_BANK_HINTS: Record<string, string> = {
  HDFC: "HDFC Bank",
  ICIC: "ICICI Bank",
  SBIN: "State Bank of India",
  UTIB: "Axis Bank",
  KKBK: "Kotak Mahindra Bank",
  PUNB: "Punjab National Bank",
  BARB: "Bank of Baroda",
  IDIB: "Indian Bank",
  IOBA: "Indian Overseas Bank",
  CNRB: "Canara Bank",
  UBIN: "Union Bank of India",
  YESB: "Yes Bank",
  INDB: "IndusInd Bank",
};

export function suggestBankNameFromIfsc(ifsc: string): string | null {
  const code = ifsc.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
  if (code.length < 4) return null;
  return IFSC_BANK_HINTS[code] ?? null;
}

export function paymentMethodLabel(method: string): string {
  return SALARY_PAYMENT_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method;
}
