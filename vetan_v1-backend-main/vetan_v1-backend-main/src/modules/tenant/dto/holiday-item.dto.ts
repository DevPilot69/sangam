import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class HolidayItemDto {
  @ApiProperty({
    example: '2026-01-26',
    description: 'ISO calendar date (YYYY-MM-DD)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ example: 'Republic Day' })
  @IsString()
  @MaxLength(200)
  name!: string;
}
