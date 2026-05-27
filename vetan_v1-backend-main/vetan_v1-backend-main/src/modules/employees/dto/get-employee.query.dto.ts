import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class GetEmployeeQueryDto {
  @ApiPropertyOptional({
    description:
      'Pass `bank` to reveal full bank account and IFSC (requires employees:write)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['bank'])
  reveal?: string;
}
