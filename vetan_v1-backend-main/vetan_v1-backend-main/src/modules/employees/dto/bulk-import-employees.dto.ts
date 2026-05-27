import { ApiProperty } from '@nestjs/swagger';
import { EmploymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** One row from CSV/Excel import (department & designation by human-readable keys). */
export class BulkEmployeeImportRowDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
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

  @ApiProperty({ required: false, description: 'Department code in this workspace' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  departmentCode?: string;

  @ApiProperty({ required: false, description: 'Designation title (first match is used)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  designationTitle?: string;

  @ApiProperty({ required: false, enum: EmploymentStatus })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  status?: EmploymentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ctcAnnual?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, { message: 'Invalid PAN format' })
  pan?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @Matches(/^[0-9]{9,18}$/, { message: 'Bank account must be 9–18 digits' })
  bankAccount?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i, { message: 'Invalid IFSC format' })
  ifsc?: string;
}

export class BulkImportEmployeesDto {
  @ApiProperty({ type: [BulkEmployeeImportRowDto], maxItems: 500 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BulkEmployeeImportRowDto)
  rows!: BulkEmployeeImportRowDto[];
}
