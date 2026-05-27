import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PasswordAdminService } from '../auth/password-admin.service';
import type { AccessTokenPayload } from '../auth/token.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';

@ApiTags('tenant — password manager')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('tenant/password-manager')
export class TenantPasswordManagerController {
  constructor(private readonly passwordAdmin: PasswordAdminService) {}

  @RequirePermission('settings:write')
  @Get('employees')
  listEmployees(@CurrentUser() user: AccessTokenPayload) {
    return this.passwordAdmin.listEmployeesForTenant(user.tenantId);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @RequirePermission('settings:write')
  @Post('employees/:employeeId/reset-password')
  resetEmployeePassword(
    @CurrentUser() user: AccessTokenPayload,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.passwordAdmin.resetPasswordByEmployeeId(
      user.tenantId,
      employeeId,
      user.sub,
    );
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @RequirePermission('settings:write')
  @Post('users/:userId/reset-password')
  resetUserPassword(
    @CurrentUser() user: AccessTokenPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.passwordAdmin.resetPasswordByUserId(user.tenantId, userId, {
      actorUserId: user.sub,
      allowTenantAdminTargets: false,
      forbidSelf: true,
    });
  }
}
