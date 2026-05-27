import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PlatformAuthGuard } from './guards/platform-auth.guard';
import { PlatformTelemetryService } from './platform-telemetry.service';

class TenantListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

@ApiTags('platform')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PlatformAuthGuard)
@Controller('platform')
export class PlatformTelemetryController {
  constructor(private readonly telemetry: PlatformTelemetryService) {}

  @Get('telemetry/summary')
  summary() {
    return this.telemetry.getSummary();
  }

  @Get('tenants')
  listTenants(@Query() query: TenantListQueryDto) {
    return this.telemetry.listTenants({ search: query.search });
  }

  @Get('tenants/:id')
  async tenantDetail(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.telemetry.getTenant(id);
    if (!row) return { found: false };
    return row;
  }
}
