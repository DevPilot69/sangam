import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class CreatePayrollRunDto {
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  periodYear!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;
}
