import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/token.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { AuditService } from './audit.service';

class ListAuditQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @IsString()
  entityType?: string;
}

@ApiTags('audit-logs')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @RequirePermission('settings:read')
  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListAuditQueryDto,
  ) {
    return this.audit.list(user.tenantId, query);
  }
}
