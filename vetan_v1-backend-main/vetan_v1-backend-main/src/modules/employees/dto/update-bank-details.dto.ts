import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { SALARY_PAYMENT_METHODS } from '../../../shared/banking/salary-payment-method';

export class UpdateBankDetailsDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(120)
  bankName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @Matches(/^[0-9]{9,18}$/, { message: 'Bank account must be 9–18 digits' })
  bankAccount?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i, { message: 'Invalid IFSC format' })
  ifsc?: string | null;

  @ApiPropertyOptional({ enum: SALARY_PAYMENT_METHODS })
  @IsOptional()
  @IsIn([...SALARY_PAYMENT_METHODS])
  salaryPaymentMethod?: (typeof SALARY_PAYMENT_METHODS)[number];
}
