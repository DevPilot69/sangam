import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SubscriptionStatus,
  TenantPaymentStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ProvisionTenantDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({
    description:
      'Unique 2–8 character org code (e.g. BR). Auto-suggested from name if omitted.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(8)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'companyCode must be letters or numbers only',
  })
  companyCode?: string;

  @ApiPropertyOptional({ description: 'URL slug; auto-generated from name if omitted' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(48)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ default: 'IN' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ description: 'Merged into tenant.settings JSON' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['STARTER', 'GROWTH', 'ENTERPRISE', 'TRIAL'] })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  planCode?: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  @ApiPropertyOptional({ description: 'Trial length when status is TRIALING' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  trialDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyFeeInr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyServerCostInr?: number;

  @ApiPropertyOptional({ enum: TenantPaymentStatus })
  @IsOptional()
  @IsEnum(TenantPaymentStatus)
  paymentStatus?: TenantPaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  billingNotes?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  adminName!: string;

  @ApiProperty()
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'adminPassword must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'adminPassword must contain a number' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'adminPassword must contain a special character',
  })
  adminPassword!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  verifyAdminEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  departmentName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  departmentCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  designationTitle?: string;

  @ApiPropertyOptional({
    description:
      'Mark tenant workspace onboarding complete (requires department + designation)',
  })
  @IsOptional()
  @IsBoolean()
  markOnboardingComplete?: boolean;
}
