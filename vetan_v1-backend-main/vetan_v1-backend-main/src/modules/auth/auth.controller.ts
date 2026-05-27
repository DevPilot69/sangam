import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private cookieOpts() {
    const secure = process.env.NODE_ENV === 'production';
    // Cross-origin frontend (e.g. Vercel) + API (Render) requires SameSite=None.
    return {
      httpOnly: true,
      secure,
      sameSite: (secure ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
      maxAge: 0,
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, {
      setCookie: (name, val, maxAgeMs) => {
        res.cookie(name, val, { ...this.cookieOpts(), maxAge: maxAgeMs });
      },
    });
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.['vetan_refresh'] as string | undefined;
    return this.auth.refresh(token, {
      setCookie: (name, val, maxAgeMs) => {
        res.cookie(name, val, { ...this.cookieOpts(), maxAge: maxAgeMs });
      },
    });
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.['vetan_refresh'] as string | undefined;
    await this.auth.logout(token);
    res.clearCookie('vetan_refresh', { ...this.cookieOpts(), maxAge: 0 });
    return { ok: true };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('forgot-password')
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('reset-password')
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@CurrentUser('sub') userId: string) {
    return this.auth.me(userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  patchProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(userId, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(userId, dto);
  }
}
