import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9-]+$/)
  tenantSlug!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;
}
