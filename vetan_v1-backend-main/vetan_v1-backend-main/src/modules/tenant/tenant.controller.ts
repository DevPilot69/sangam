import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/token.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { PatchTenantSettingsDto } from './dto/patch-tenant-settings.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantService } from './tenant.service';

@ApiTags('tenant')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenant: TenantService) {}

  @RequirePermission('settings:read')
  @Get()
  get(@CurrentUser() user: AccessTokenPayload) {
    return this.tenant.getCurrent(user.tenantId);
  }

  @RequirePermission('settings:write')
  @Patch()
  patch(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateTenantDto) {
    return this.tenant.updateCurrent(user.tenantId, dto);
  }

  @RequirePermission('settings:write')
  @Patch('settings')
  patchSettings(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: PatchTenantSettingsDto,
  ) {
    return this.tenant.patchSettings(user.tenantId, dto);
  }

  @RequirePermission('settings:write')
  @Post('complete-onboarding')
  completeOnboarding(@CurrentUser() user: AccessTokenPayload) {
    return this.tenant.completeOnboarding(user.tenantId);
  }
}
