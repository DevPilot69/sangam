import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/token.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RunReportDto } from './dto/run-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @RequirePermission('reports:read')
  @Get('catalog')
  catalog() {
    return this.reports.catalog();
  }

  @RequirePermission('reports:read')
  @Post('run')
  run(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: RunReportDto,
  ) {
    return this.reports.run(user.tenantId, dto);
  }
}
