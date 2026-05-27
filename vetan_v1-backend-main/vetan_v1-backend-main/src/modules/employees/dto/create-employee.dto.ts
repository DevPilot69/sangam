import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { SALARY_PAYMENT_METHODS } from '../../../shared/banking/salary-payment-method';

export class CreateEmployeeDto {
  @ApiPropertyOptional({
    description: 'Unique within tenant; auto-generated if omitted',
  })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
  employeeCode?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateOfJoining!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  designationId?: string;

  @ApiPropertyOptional({ enum: EmploymentStatus })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  status?: EmploymentStatus;

  @ApiPropertyOptional({ description: 'Annual CTC (INR)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ctcAnnual?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, { message: 'Invalid PAN format' })
  pan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @Matches(/^[0-9]{9,18}$/, { message: 'Bank account must be 9–18 digits' })
  bankAccount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i, { message: 'Invalid IFSC format' })
  ifsc?: string;

  @ApiPropertyOptional({ enum: SALARY_PAYMENT_METHODS, default: 'NEFT' })
  @IsOptional()
  @IsIn([...SALARY_PAYMENT_METHODS])
  salaryPaymentMethod?: (typeof SALARY_PAYMENT_METHODS)[number];
}
