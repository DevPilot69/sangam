import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateDepartmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, {
    message: 'code must be alphanumeric (may include _ or -)',
  })
  code?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Set to null to clear department head',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  headUserId?: string | null;
}
