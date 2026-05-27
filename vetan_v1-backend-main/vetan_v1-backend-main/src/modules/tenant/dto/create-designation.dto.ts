import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDesignationDto {
  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'L5' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
