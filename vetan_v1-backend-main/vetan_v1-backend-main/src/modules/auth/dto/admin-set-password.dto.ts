import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Admin-initiated password set (no current password required). */
export class AdminSetPasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  @Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain a number' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'password must contain a special character',
  })
  password!: string;
}
