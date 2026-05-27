import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PasswordAdminService } from '../auth/password-admin.service';
import { PlatformAuthGuard } from './guards/platform-auth.guard';

@ApiTags('platform')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PlatformAuthGuard)
@Controller('platform/tenants/:tenantId/password-manager')
export class PlatformPasswordManagerController {
  constructor(private readonly passwordAdmin: PasswordAdminService) {}

  @Get('accounts')
  listAccounts(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query('type') type?: string,
  ) {
    const filter =
      type === 'tenant_admin' || type === 'employee' ? type : 'all';
    return this.passwordAdmin.listForPlatform(tenantId, filter);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('users/:userId/reset-password')
  resetUserPassword(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.passwordAdmin.resetPasswordByUserId(tenantId, userId, {
      actorUserId: null,
      allowTenantAdminTargets: true,
    });
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('employees/:employeeId/reset-password')
  resetEmployeePassword(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.passwordAdmin.resetPasswordByEmployeeId(
      tenantId,
      employeeId,
      null,
    );
  }
}
