import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/token.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { CreateHolidaysDto } from './dto/create-holidays.dto';
import { ListHolidaysQueryDto } from './dto/list-holidays.query.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { HolidaysService } from './org/holidays.service';

@ApiTags('tenant — holidays')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('tenant/holidays')
export class TenantHolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @RequirePermission('settings:read')
  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListHolidaysQueryDto,
  ) {
    return this.holidays.list(user.tenantId, query);
  }

  @RequirePermission('settings:write')
  @Post()
  upsertMany(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateHolidaysDto,
  ) {
    return this.holidays.upsertMany(user.tenantId, dto);
  }

  @RequirePermission('settings:write')
  @Patch(':id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.holidays.update(user.tenantId, id, dto);
  }

  @RequirePermission('settings:write')
  @Delete(':id')
  remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.holidays.remove(user.tenantId, id);
  }
}
