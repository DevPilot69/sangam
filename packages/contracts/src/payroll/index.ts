import { z } from "zod";

const SALARY_PAYMENT_METHODS = [
  "NEFT",
  "RTGS",
  "IMPS",
  "CHEQUE",
  "CASH",
] as const;

export const SALARY_PAYMENT_METHOD_VALUES = SALARY_PAYMENT_METHODS;
export type SalaryPaymentMethod = (typeof SALARY_PAYMENT_METHODS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/payroll/runs — list query

export const ListPayrollRunsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ListPayrollRunsQueryDto = z.infer<
  typeof ListPayrollRunsQuerySchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/payroll/runs

export const CreatePayrollRunSchema = z.object({
  periodYear: z.coerce.number().int().min(2020).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12),
});
export type CreatePayrollRunDto = z.infer<typeof CreatePayrollRunSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /v1/payroll/runs/[id]/setup

export const UpdatePayrollSetupSchema = z.object({
  excludedEmployeeIds: z.array(z.string().uuid()),
  ackWarnings: z.boolean().optional(),
  ackWarningsReason: z.string().max(500).optional(),
  disbursementPaymentMethod: z.enum(SALARY_PAYMENT_METHODS).optional(),
});
export type UpdatePayrollSetupDto = z.infer<typeof UpdatePayrollSetupSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/payroll/runs/[id]/finalize

export const FinalizePayrollRunSchema = z.object({
  confirmText: z.literal("CONFIRM"),
});
export type FinalizePayrollRunDto = z.infer<typeof FinalizePayrollRunSchema>;
