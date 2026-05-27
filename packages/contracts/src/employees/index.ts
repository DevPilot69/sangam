import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Shared atoms

const SALARY_PAYMENT_METHODS = [
  "NEFT",
  "RTGS",
  "IMPS",
  "CHEQUE",
  "CASH",
] as const;

const EMPLOYMENT_STATUS = [
  "ACTIVE",
  "ON_LEAVE",
  "NOTICE",
  "INACTIVE",
] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
const bankAccountRegex = /^[0-9]{9,18}$/;
const employeeCodeRegex = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

// `nullishWithString` mimics class-validator's `@ValidateIf((_, v) => v != null
// && String(v).trim() !== '')` — we want to accept null|undefined|""
// gracefully but validate when a value is present.
function optional<S extends z.ZodTypeAny>(schema: S) {
  return schema.optional();
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/employees

export const CreateEmployeeSchema = z.object({
  employeeCode: optional(
    z.string().min(1).max(32).regex(employeeCodeRegex),
  ),
  firstName: z.string().max(100),
  lastName: z.string().max(100),
  email: z.string().email().max(255),
  dateOfJoining: isoDate,
  departmentId: optional(z.string().uuid()),
  designationId: optional(z.string().uuid()),
  status: optional(z.enum(EMPLOYMENT_STATUS)),
  ctcAnnual: optional(z.coerce.number().min(0)),
  pan: optional(z.string().regex(panRegex, "Invalid PAN format")),
  bankName: optional(z.string().max(120)),
  bankAccount: optional(
    z.string().regex(bankAccountRegex, "Bank account must be 9–18 digits"),
  ),
  ifsc: optional(z.string().regex(ifscRegex, "Invalid IFSC format")),
  salaryPaymentMethod: optional(z.enum(SALARY_PAYMENT_METHODS)),
});
export type CreateEmployeeDto = z.infer<typeof CreateEmployeeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /v1/employees/[id]

export const UpdateEmployeeSchema = z.object({
  employeeCode: optional(
    z.string().min(1).max(32).regex(employeeCodeRegex),
  ),
  firstName: optional(z.string().max(100)),
  lastName: optional(z.string().max(100)),
  email: optional(z.string().email().max(255)),
  dateOfJoining: optional(isoDate),
  departmentId: optional(z.union([z.string().uuid(), z.null()])),
  designationId: optional(z.union([z.string().uuid(), z.null()])),
  status: optional(z.enum(EMPLOYMENT_STATUS)),
  ctcAnnual: optional(z.union([z.coerce.number().min(0), z.null()])),
  pan: optional(
    z.union([z.string().regex(panRegex, "Invalid PAN format"), z.null()]),
  ),
});
export type UpdateEmployeeDto = z.infer<typeof UpdateEmployeeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /v1/employees/[id]/bank-details

export const UpdateBankDetailsSchema = z.object({
  bankName: optional(z.union([z.string().max(120), z.null()])),
  bankAccount: optional(
    z.union([
      z.string().regex(bankAccountRegex, "Bank account must be 9–18 digits"),
      z.null(),
    ]),
  ),
  ifsc: optional(
    z.union([z.string().regex(ifscRegex, "Invalid IFSC format"), z.null()]),
  ),
  salaryPaymentMethod: optional(z.enum(SALARY_PAYMENT_METHODS)),
});
export type UpdateBankDetailsDto = z.infer<typeof UpdateBankDetailsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/employees

export const EMPLOYEE_RECORD_SCOPES = [
  "active",
  "deactivated",
  "all",
] as const;

export const ListEmployeesQuerySchema = z.object({
  page: optional(z.coerce.number().int().min(1)),
  pageSize: optional(z.coerce.number().int().min(1).max(100)),
  search: optional(z.string().max(120)),
  record: optional(z.enum(EMPLOYEE_RECORD_SCOPES)),
  status: optional(z.enum(EMPLOYMENT_STATUS)),
  departmentId: optional(z.string().uuid()),
  designationId: optional(z.string().uuid()),
  dateOfJoiningFrom: optional(isoDate),
  dateOfJoiningTo: optional(isoDate),
});
export type ListEmployeesQueryDto = z.infer<typeof ListEmployeesQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/employees/[id]

export const GetEmployeeQuerySchema = z.object({
  reveal: optional(z.enum(["bank"])),
});
export type GetEmployeeQueryDto = z.infer<typeof GetEmployeeQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/employees/bulk

export const BulkEmployeeImportRowSchema = z.object({
  employeeCode: optional(
    z.string().min(1).max(32).regex(employeeCodeRegex),
  ),
  firstName: z.string().max(100),
  lastName: z.string().max(100),
  email: z.string().email().max(255),
  dateOfJoining: isoDate,
  departmentCode: optional(z.string().max(64)),
  designationTitle: optional(z.string().max(200)),
  status: optional(z.enum(EMPLOYMENT_STATUS)),
  ctcAnnual: optional(z.coerce.number().min(0)),
  pan: optional(z.string().regex(panRegex, "Invalid PAN format")),
  bankAccount: optional(
    z.string().regex(bankAccountRegex, "Bank account must be 9–18 digits"),
  ),
  ifsc: optional(z.string().regex(ifscRegex, "Invalid IFSC format")),
});
export type BulkEmployeeImportRowDto = z.infer<
  typeof BulkEmployeeImportRowSchema
>;

export const BulkImportEmployeesSchema = z.object({
  rows: z.array(BulkEmployeeImportRowSchema).min(1).max(500),
});
export type BulkImportEmployeesDto = z.infer<typeof BulkImportEmployeesSchema>;

export type EmployeeRecordScope = (typeof EMPLOYEE_RECORD_SCOPES)[number];
