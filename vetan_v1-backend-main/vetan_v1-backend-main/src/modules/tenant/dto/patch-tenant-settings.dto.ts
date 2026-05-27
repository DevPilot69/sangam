import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Company profile stored under `settings.companyProfile` (beyond core Tenant name/legalName). */
export class CompanyProfileSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(320)
  officialEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  industryType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  registrationNumber?: string;

  @ApiPropertyOptional({ description: 'ISO date string YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  incorporationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  companyPan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gst?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  cin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  companyAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  websiteUrl?: string;
}

export class StatutoryComplianceSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  pfRegistrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  esicNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  professionalTaxNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  labourWelfareFundDetails?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tdsCircleWard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  shopEstablishmentLicense?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  msmeNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  startupIndiaRegistration?: string;
}

export class PayrollConfigurationSettingsDto {
  @ApiPropertyOptional({ example: 'Monthly' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  salaryCycle?: string;

  @ApiPropertyOptional({ example: 'Last working day' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  payDate?: string;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiPropertyOptional({ example: 'Monthly' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  payrollFrequency?: string;

  @ApiPropertyOptional({ example: 'April' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  payrollStartMonth?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated or free-text list of default components',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  salaryComponents?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  variablePayEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  overtimeEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reimbursementEnabled?: boolean;
}

export class DocumentTemplatesSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  payslipTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  offerLetterTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  appointmentLetterTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  salaryRevisionLetterTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  experienceLetterTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  form16Template?: string;
}

export class SaasTenantSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  billingCycle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  activeUsersLimit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  storageLimit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customBranding?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(253)
  customDomain?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  featureFlags?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  apiAccess?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  auditLogsEnabled?: boolean;
}

export class BankingDisbursementSettingsDto {
  @ApiPropertyOptional({ example: 'HDFC Bank' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Company bank account number for salary debits' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[0-9]{9,18}$/, {
    message: 'Bank account must be 9–18 digits',
  })
  companyBankAccount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(11)
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i, { message: 'Invalid IFSC format' })
  ifsc?: string;

  @ApiPropertyOptional({ enum: ['NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'CASH'] })
  @IsOptional()
  @IsIn(['NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'CASH'])
  salaryPaymentMethod?: string;
}

export class NotificationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  payslipEmails?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  leaveNotifications?: boolean;
}

/** PATCH body merges into `Tenant.settings` JSON (deep merge per top-level key). */
export class PatchTenantSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyProfileSettingsDto)
  companyProfile?: CompanyProfileSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => StatutoryComplianceSettingsDto)
  statutoryCompliance?: StatutoryComplianceSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PayrollConfigurationSettingsDto)
  payrollConfiguration?: PayrollConfigurationSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentTemplatesSettingsDto)
  documentTemplates?: DocumentTemplatesSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SaasTenantSettingsDto)
  saasTenant?: SaasTenantSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BankingDisbursementSettingsDto)
  bankingDisbursement?: BankingDisbursementSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notifications?: NotificationSettingsDto;
}
