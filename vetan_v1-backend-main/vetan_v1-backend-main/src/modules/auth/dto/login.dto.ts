import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Workspace slug from registration (lowercase company handle)',
  })
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9-]+$/)
  tenantSlug!: string;

  @ApiProperty({
    description:
      'Tenant admin: work email. Employee portal: companyCode + employeeId (e.g. BREMP-0001)',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  login!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;
}
