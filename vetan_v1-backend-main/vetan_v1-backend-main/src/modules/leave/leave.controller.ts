import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LeaveRequestStatus } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/token.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { LeaveService } from './leave.service';

class ListLeaveQueryDto {
  @IsOptional()
  @IsEnum(LeaveRequestStatus)
  status?: LeaveRequestStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

class PatchLeaveStatusDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';
}

@ApiTags('leave')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @RequirePermission('leave:read')
  @Get('requests')
  listRequests(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListLeaveQueryDto,
  ) {
    return this.leave.listRequests(user.tenantId, {
      status: query.status,
      limit: query.limit,
    });
  }

  @RequirePermission('leave:read')
  @Get('balances')
  listBalances(@CurrentUser() user: AccessTokenPayload) {
    return this.leave.listBalances(user.tenantId);
  }

  @RequirePermission('leave:approve')
  @Patch('requests/:id/status')
  patchStatus(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchLeaveStatusDto,
  ) {
    return this.leave.updateRequestStatus(user.tenantId, id, dto.status);
  }
}
