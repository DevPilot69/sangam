import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { EnvVars } from '../../config/validate-env';
import { PrismaModule } from '../../database/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmployeeCredentialsService } from './employee-credentials.service';
import { PasswordAdminService } from './password-admin.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

@Module({
  imports: [
    PrismaModule,
    BillingModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRES', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    EmployeeCredentialsService,
    PasswordAdminService,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    TokenService,
    EmployeeCredentialsService,
    PasswordAdminService,
  ],
})
export class AuthModule {}
