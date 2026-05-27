import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/token.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';
import { DesignationsService } from './org/designations.service';

@ApiTags('tenant — designations')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('tenant/designations')
export class TenantDesignationsController {
  constructor(private readonly designations: DesignationsService) {}

  @RequirePermission('settings:read')
  @Get()
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.designations.list(user.tenantId);
  }

  @RequirePermission('settings:write')
  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateDesignationDto,
  ) {
    return this.designations.create(user.tenantId, dto);
  }

  @RequirePermission('settings:write')
  @Patch(':id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignationDto,
  ) {
    return this.designations.update(user.tenantId, id, dto);
  }

  @RequirePermission('settings:write')
  @Delete(':id')
  remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.designations.remove(user.tenantId, id);
  }
}
