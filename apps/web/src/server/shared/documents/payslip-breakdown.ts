/**
 * Split payroll entry breakdown JSON into earnings vs deduction lines.
 * Ported verbatim from src/shared/documents/payslip-breakdown.ts (NestJS).
 */
export type PayslipLine = { label: string; amount: number };

const DEDUCTION_PATTERN =
  /^(pf|esi|epf|tds|tax|pt\b|professional|deduction|loan|advance|vpf|lwf)/i;

function toTitle(s: string): string {
  return s
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

export function splitPayslipBreakdown(
  breakdown: unknown,
  gross: number,
  deductionsTotal: number,
): { earnings: PayslipLine[]; deductions: PayslipLine[] } {
  if (
    breakdown &&
    typeof breakdown === "object" &&
    !Array.isArray(breakdown) &&
    "earnings" in breakdown &&
    "deductions" in breakdown
  ) {
    const o = breakdown as { earnings?: unknown; deductions?: unknown };
    const earnings = normalizeSection(o.earnings, "Gross pay", gross);
    const deductions = normalizeSection(
      o.deductions,
      "Deductions",
      deductionsTotal,
    );
    return { earnings, deductions };
  }

  if (
    !breakdown ||
    typeof breakdown !== "object" ||
    Array.isArray(breakdown)
  ) {
    return {
      earnings: [{ label: "Gross pay", amount: gross }],
      deductions:
        deductionsTotal > 0
          ? [{ label: "Total deductions", amount: deductionsTotal }]
          : [],
    };
  }

  const flat = breakdown as Record<string, unknown>;
  const earnings: PayslipLine[] = [];
  const deductions: PayslipLine[] = [];

  for (const [key, raw] of Object.entries(flat)) {
    if (key === "earnings" || key === "deductions") continue;
    const amount = Number(raw);
    if (!Number.isFinite(amount)) continue;
    const lower = key.toLowerCase();
    const line = { label: toTitle(key), amount };
    if (
      DEDUCTION_PATTERN.test(lower) ||
      lower.includes("deduct") ||
      lower.includes("tds")
    ) {
      deductions.push(line);
    } else {
      earnings.push(line);
    }
  }

  if (earnings.length === 0) {
    earnings.push({ label: "Gross pay", amount: gross });
  }
  if (deductions.length === 0 && deductionsTotal > 0) {
    deductions.push({ label: "Total deductions", amount: deductionsTotal });
  }

  return { earnings, deductions };
}

function normalizeSection(
  section: unknown,
  fallbackLabel: string,
  fallbackAmount: number,
): PayslipLine[] {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    if (fallbackAmount > 0)
      return [{ label: fallbackLabel, amount: fallbackAmount }];
    return [];
  }
  const lines: PayslipLine[] = [];
  for (const [key, raw] of Object.entries(section)) {
    const amount = Number(raw);
    if (!Number.isFinite(amount)) continue;
    lines.push({ label: toTitle(key), amount });
  }
  if (lines.length === 0 && fallbackAmount > 0) {
    return [{ label: fallbackLabel, amount: fallbackAmount }];
  }
  return lines;
}
