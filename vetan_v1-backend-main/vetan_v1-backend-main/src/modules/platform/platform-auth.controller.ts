import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/token.service';
import { PlatformAuthGuard } from './guards/platform-auth.guard';
import { PlatformAuthService } from './platform-auth.service';

class PlatformLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@ApiTags('platform')
@Controller('platform')
export class PlatformAuthController {
  constructor(private readonly auth: PlatformAuthService) {}

  @Post('auth/login')
  login(@Body() dto: PlatformLoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), PlatformAuthGuard)
  @Get('auth/me')
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.auth.me(user.sub);
  }
}
