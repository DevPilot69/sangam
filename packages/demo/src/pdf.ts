import { isDemoMode } from "./demo-mode";

/**
 * PDF generation mock provider.
 *
 * In NestJS we generated payslips on the fly with `pdfkit`. Pdfkit ships
 * native font binaries and is heavy on cold-start in serverless. To keep the
 * demo deploy slim and fast we return a canned URL pointing at
 * `/samples/sample-payslip.pdf` (or `/samples/sample-invoice.pdf` for
 * invoices) and surface plausible metadata.
 *
 * Surface (kept intentionally narrow so the real swap is mechanical):
 *   - `generatePayslip(employeeId, periodYear, periodMonth)` -> `{ url, fileName, mimeType }`
 *   - `generateInvoice(invoiceId)`                            -> `{ url, fileName, mimeType }`
 *
 * Phase 6 swap: replace this module with a real pdfkit pipeline or a Vercel
 * Edge-friendly renderer. Toggle by setting `DEMO_MODE=false`. Real
 * generation can still use the same return shape so callers don't change.
 */

export type GeneratedDocument = {
  url: string;
  fileName: string;
  mimeType: string;
  storage: "sample" | "blob" | "s3";
};

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function notDemo(): never {
  throw new Error(
    "Real PDF provider not wired yet. Set DEMO_MODE=true or implement pdfkit/edge renderer.",
  );
}

export function generatePayslip(
  employeeCode: string,
  periodYear: number,
  periodMonth: number,
): GeneratedDocument {
  if (!isDemoMode()) notDemo();
  const month = SHORT_MONTHS[periodMonth - 1] ?? String(periodMonth);
  return {
    url: "/samples/sample-payslip.pdf",
    fileName: `payslip-${employeeCode}-${month}-${periodYear}.pdf`,
    mimeType: "application/pdf",
    storage: "sample",
  };
}

export function generateInvoice(invoiceNumber: string): GeneratedDocument {
  if (!isDemoMode()) notDemo();
  return {
    url: "/samples/sample-invoice.pdf",
    fileName: `invoice-${invoiceNumber}.pdf`,
    mimeType: "application/pdf",
    storage: "sample",
  };
}
