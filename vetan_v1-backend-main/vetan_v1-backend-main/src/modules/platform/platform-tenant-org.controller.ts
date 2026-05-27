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
import { CreateDepartmentDto } from '../tenant/dto/create-department.dto';
import { CreateDesignationDto } from '../tenant/dto/create-designation.dto';
import { UpdateDepartmentDto } from '../tenant/dto/update-department.dto';
import { UpdateDesignationDto } from '../tenant/dto/update-designation.dto';
import { DepartmentsService } from '../tenant/org/departments.service';
import { DesignationsService } from '../tenant/org/designations.service';
import { PlatformAuthGuard } from './guards/platform-auth.guard';

@ApiTags('platform')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PlatformAuthGuard)
@Controller('platform/tenants/:tenantId/org')
export class PlatformTenantOrgController {
  constructor(
    private readonly departments: DepartmentsService,
    private readonly designations: DesignationsService,
  ) {}

  @Get('departments')
  listDepartments(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.departments.list(tenantId);
  }

  @Post('departments')
  createDepartment(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departments.create(tenantId, dto);
  }

  @Patch('departments/:id')
  updateDepartment(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departments.update(tenantId, id, dto);
  }

  @Delete('departments/:id')
  removeDepartment(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.departments.remove(tenantId, id);
  }

  @Get('designations')
  listDesignations(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.designations.list(tenantId);
  }

  @Post('designations')
  createDesignation(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: CreateDesignationDto,
  ) {
    return this.designations.create(tenantId, dto);
  }

  @Patch('designations/:id')
  updateDesignation(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignationDto,
  ) {
    return this.designations.update(tenantId, id, dto);
  }

  @Delete('designations/:id')
  removeDesignation(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.designations.remove(tenantId, id);
  }
}
