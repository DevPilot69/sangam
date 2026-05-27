import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SALARY_PAYMENT_METHODS } from '../../../shared/banking/salary-payment-method';

export class UpdatePayrollSetupDto {
  @IsArray()
  @IsUUID('4', { each: true })
  excludedEmployeeIds!: string[];

  @IsOptional()
  @IsBoolean()
  ackWarnings?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ackWarningsReason?: string;

  @IsOptional()
  @IsIn([...SALARY_PAYMENT_METHODS])
  disbursementPaymentMethod?: (typeof SALARY_PAYMENT_METHODS)[number];
}