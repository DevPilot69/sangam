import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { HolidayItemDto } from './holiday-item.dto';

export class CreateHolidaysDto {
  @ApiProperty({ type: [HolidayItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HolidayItemDto)
  holidays!: HolidayItemDto[];
}
