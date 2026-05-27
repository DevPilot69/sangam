import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Engineering' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'ENG' })
  @IsString()
  @Length(1, 32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, {
    message: 'code must be alphanumeric (may include _ or -)',
  })
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  headUserId?: string;
}
