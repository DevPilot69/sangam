/**
 * @sangam/demo — env-gated mock providers.
 *
 * When `DEMO_MODE=true` (default in dev), every external integration is
 * replaced by a behaviour-preserving mock so the entire app remains
 * demoable without third-party credentials.
 *
 *   email     — SendGrid swap. Mocks insert a row into the MockEmail table
 *               and a read endpoint surfaces them at /platform/inbox.
 *   storage   — S3 / Vercel Blob swap. Mocks record file metadata only;
 *               downloads serve sample PDFs from apps/web/public/samples/.
 *   pdf       — pdfkit swap for payslips/invoices. Returns a URL to a
 *               pre-baked sample.
 *   razorpay  — full Razorpay client swap. Synthetic order ids;
 *               verifyPayment always passes; webhook synthesized via admin
 *               button.
 *   biometric — daily attendance seeder. Cron-driven; also exposes a
 *               "Simulate today" manual trigger.
 *
 * Implementations are wired phase-by-phase. Phase 0 ships the registry
 * (`isDemoMode()`) only.
 */

export { isDemoMode } from "./demo-mode";
export * from "./email";
export * from "./storage";
export * as biometric from "./biometric";
export * as pdf from "./pdf";
export * as razorpay from "./razorpay";
