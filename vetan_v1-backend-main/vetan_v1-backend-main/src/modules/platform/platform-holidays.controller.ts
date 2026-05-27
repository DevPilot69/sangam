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
@Controller('platform/holidays')
export class PlatformHolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Get()
  list(@Query() query: ListHolidaysQueryDto) {
    return this.holidays.listPlatform(query);
  }

  @Post()
  upsertMany(@Body() dto: CreateHolidaysDto) {
    return this.holidays.upsertManyPlatform(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.holidays.updatePlatform(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.holidays.removePlatform(id);
  }
}
