import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /v1/tenant

export const UpdateTenantSchema = z.object({
  name: z.string().max(200).optional(),
  legalName: z.string().max(200).optional(),
  industry: z.string().max(120).optional(),
  country: z.string().max(2).optional(),
  companyCode: z
    .string()
    .min(2)
    .max(8)
    .regex(/^[A-Za-z0-9]+$/)
    .optional(),
});
export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /v1/tenant/settings — nested groups, each optional

const CompanyProfileSettingsSchema = z.object({
  officialEmail: z.string().max(320).optional(),
  companyType: z.string().max(120).optional(),
  industryType: z.string().max(120).optional(),
  registrationNumber: z.string().max(120).optional(),
  incorporationDate: z.string().max(32).optional(),
  companyPan: z.string().max(20).optional(),
  tan: z.string().max(20).optional(),
  gst: z.string().max(20).optional(),
  cin: z.string().max(40).optional(),
  companyAddress: z.string().max(2000).optional(),
  websiteUrl: z.string().max(500).optional(),
});

const StatutoryComplianceSettingsSchema = z.object({
  pfRegistrationNumber: z.string().max(120).optional(),
  esicNumber: z.string().max(120).optional(),
  professionalTaxNumber: z.string().max(120).optional(),
  labourWelfareFundDetails: z.string().max(2000).optional(),
  tdsCircleWard: z.string().max(200).optional(),
  shopEstablishmentLicense: z.string().max(200).optional(),
  msmeNumber: z.string().max(120).optional(),
  startupIndiaRegistration: z.string().max(120).optional(),
});

const PayrollConfigurationSettingsSchema = z.object({
  salaryCycle: z.string().max(40).optional(),
  payDate: z.string().max(80).optional(),
  currency: z.string().max(8).optional(),
  payrollFrequency: z.string().max(40).optional(),
  payrollStartMonth: z.string().max(40).optional(),
  salaryComponents: z.string().max(2000).optional(),
  variablePayEnabled: z.boolean().optional(),
  overtimeEnabled: z.boolean().optional(),
  reimbursementEnabled: z.boolean().optional(),
});

const DocumentTemplatesSettingsSchema = z.object({
  payslipTemplate: z.string().max(500).optional(),
  offerLetterTemplate: z.string().max(500).optional(),
  appointmentLetterTemplate: z.string().max(500).optional(),
  salaryRevisionLetterTemplate: z.string().max(500).optional(),
  experienceLetterTemplate: z.string().max(500).optional(),
  form16Template: z.string().max(500).optional(),
});

const SaasTenantSettingsSchema = z.object({
  billingCycle: z.string().max(40).optional(),
  activeUsersLimit: z.string().max(20).optional(),
  storageLimit: z.string().max(20).optional(),
  customBranding: z.string().max(2000).optional(),
  customDomain: z.string().max(253).optional(),
  featureFlags: z.record(z.string(), z.unknown()).optional(),
  apiAccess: z.boolean().optional(),
  auditLogsEnabled: z.boolean().optional(),
});

const BankingDisbursementSettingsSchema = z.object({
  bankName: z.string().max(120).optional(),
  companyBankAccount: z
    .string()
    .max(32)
    .regex(/^[0-9]{9,18}$/, "Bank account must be 9–18 digits")
    .optional(),
  ifsc: z
    .string()
    .max(11)
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Invalid IFSC format")
    .optional(),
  salaryPaymentMethod: z
    .enum(["NEFT", "RTGS", "IMPS", "CHEQUE", "CASH"])
    .optional(),
});

const NotificationSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  payslipEmails: z.boolean().optional(),
  leaveNotifications: z.boolean().optional(),
});

export const PatchTenantSettingsSchema = z.object({
  companyProfile: CompanyProfileSettingsSchema.optional(),
  statutoryCompliance: StatutoryComplianceSettingsSchema.optional(),
  payrollConfiguration: PayrollConfigurationSettingsSchema.optional(),
  documentTemplates: DocumentTemplatesSettingsSchema.optional(),
  saasTenant: SaasTenantSettingsSchema.optional(),
  bankingDisbursement: BankingDisbursementSettingsSchema.optional(),
  notifications: NotificationSettingsSchema.optional(),
});
export type PatchTenantSettingsDto = z.infer<typeof PatchTenantSettingsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Departments

export const CreateDepartmentSchema = z.object({
  name: z.string().max(200),
  code: z
    .string()
    .min(1)
    .max(32)
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
      "code must be alphanumeric (may include _ or -)",
    ),
  headUserId: z.string().uuid().optional(),
});
export type CreateDepartmentDto = z.infer<typeof CreateDepartmentSchema>;

export const UpdateDepartmentSchema = z.object({
  name: z.string().max(200).optional(),
  code: z
    .string()
    .min(1)
    .max(32)
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
      "code must be alphanumeric (may include _ or -)",
    )
    .optional(),
  headUserId: z
    .union([z.string().uuid(), z.null()])
    .optional(),
});
export type UpdateDepartmentDto = z.infer<typeof UpdateDepartmentSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Designations

export const CreateDesignationSchema = z.object({
  title: z.string().max(200),
  grade: z.string().max(50).optional(),
  departmentId: z.string().uuid().optional(),
});
export type CreateDesignationDto = z.infer<typeof CreateDesignationSchema>;

export const UpdateDesignationSchema = z.object({
  title: z.string().max(200).optional(),
  grade: z.union([z.string().max(50), z.null()]).optional(),
  departmentId: z.union([z.string().uuid(), z.null()]).optional(),
});
export type UpdateDesignationDto = z.infer<typeof UpdateDesignationSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Holidays

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const HolidayItemSchema = z.object({
  date: isoDate,
  name: z.string().max(200),
});
export type HolidayItemDto = z.infer<typeof HolidayItemSchema>;

export const CreateHolidaysSchema = z.object({
  holidays: z.array(HolidayItemSchema).min(1),
});
export type CreateHolidaysDto = z.infer<typeof CreateHolidaysSchema>;

export const UpdateHolidaySchema = z.object({
  date: isoDate.optional(),
  name: z.string().max(200).optional(),
});
export type UpdateHolidayDto = z.infer<typeof UpdateHolidaySchema>;

export const ListHolidaysQuerySchema = z.object({
  year: z.coerce.number().int().min(1970).max(2100).optional(),
});
export type ListHolidaysQueryDto = z.infer<typeof ListHolidaysQuerySchema>;
