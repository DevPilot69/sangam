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
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './org/departments.service';

@ApiTags('tenant — departments')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('tenant/departments')
export class TenantDepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @RequirePermission('settings:read')
  @Get()
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.departments.list(user.tenantId);
  }

  @RequirePermission('settings:write')
  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departments.create(user.tenantId, dto);
  }

  @RequirePermission('settings:write')
  @Patch(':id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departments.update(user.tenantId, id, dto);
  }

  @RequirePermission('settings:write')
  @Delete(':id')
  remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.departments.remove(user.tenantId, id);
  }
}
