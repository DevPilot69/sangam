import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  token!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain a number' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'password must contain a special character',
  })
  password!: string;
}
