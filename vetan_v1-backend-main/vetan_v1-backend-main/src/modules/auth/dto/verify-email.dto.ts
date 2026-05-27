import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9-]+$/)
  tenantSlug!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}
