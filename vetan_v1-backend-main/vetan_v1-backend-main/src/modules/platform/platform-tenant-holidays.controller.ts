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
import { CreateHolidaysDto } from '../tenant/dto/create-holidays.dto';
import { ListHolidaysQueryDto } from '../tenant/dto/list-holidays.query.dto';
import { UpdateHolidayDto } from '../tenant/dto/update-holiday.dto';
import { HolidaysService } from '../tenant/org/holidays.service';
import { PlatformAuthGuard } from './guards/platform-auth.guard';

@ApiTags('platform')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PlatformAuthGuard)
@Controller('platform/tenants/:tenantId/holidays')
export class PlatformTenantHolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Get()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: ListHolidaysQueryDto,
  ) {
    return this.holidays.listEffectiveForTenant(tenantId, query);
  }

  @Get('tenant-only')
  listTenantOnly(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: ListHolidaysQueryDto,
  ) {
    return this.holidays.listTenantOnly(tenantId, query);
  }

  @Post()
  upsertMany(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: CreateHolidaysDto,
  ) {
    return this.holidays.upsertMany(tenantId, dto);
  }

  @Patch(':id')
  update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.holidays.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.holidays.remove(tenantId, id);
  }
}
