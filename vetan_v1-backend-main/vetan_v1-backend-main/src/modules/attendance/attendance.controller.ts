import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/token.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { AttendanceService } from './attendance.service';
import type { AttendancePreset } from './attendance-query.util';

class AttendanceQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsIn(['today', 'yesterday', 'week', 'month', 'range'])
  preset?: AttendancePreset;

  @IsOptional()
  @IsIn(['PRESENT', 'ABSENT', 'LATE', 'WFH'])
  status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'WFH';
}

@ApiTags('attendance')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @RequirePermission('attendance:read')
  @Get('months')
  monthOptions() {
    return this.attendance.getMonthOptions();
  }

  @RequirePermission('attendance:read')
  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendance.list(user.tenantId, query);
  }

  @RequirePermission('attendance:read')
  @Get('summary')
  summary(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendance.summary(user.tenantId, query);
  }
}
