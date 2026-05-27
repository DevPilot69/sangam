import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListHolidaysQueryDto {
  @ApiPropertyOptional({
    description: 'Filter holidays in this calendar year (UTC)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(2100)
  year?: number;
}
