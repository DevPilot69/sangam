import {
  Body,
  Controller,
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
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/token.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { FinalizePayrollRunDto } from './dto/finalize-payroll-run.dto';
import { UpdatePayrollSetupDto } from './dto/update-payroll-setup.dto';
import { SALARY_PAYMENT_METHOD_LABELS } from '../../shared/banking/salary-payment-method';
import { PayrollService } from './payroll.service';

class ListPayrollRunsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@ApiTags('payroll')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @RequirePermission('payroll:read')
  @Get('disbursement-options')
  disbursementOptions() {
    return {
      methods: Object.entries(SALARY_PAYMENT_METHOD_LABELS).map(
        ([value, meta]) => ({
          value,
          label: meta.label,
          description: meta.description,
        }),
      ),
    };
  }

  @RequirePermission('payroll:read')
  @Get('runs')
  listRuns(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListPayrollRunsQueryDto,
  ) {
    return this.payroll.listRuns(user.tenantId, query.limit ?? 24);
  }

  @RequirePermission('payroll:run')
  @Post('runs')
  createRun(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreatePayrollRunDto,
  ) {
    return this.payroll.createRun(user.tenantId, user.sub, dto);
  }

  @RequirePermission('payroll:read')
  @Get('runs/:id')
  getRun(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payroll.getRun(user.tenantId, id);
  }

  @RequirePermission('payroll:read')
  @Get('runs/:id/setup')
  getSetup(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payroll.getSetup(user.tenantId, id);
  }

  @RequirePermission('payroll:run')
  @Patch('runs/:id/setup')
  updateSetup(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollSetupDto,
  ) {
    return this.payroll.updateSetup(user.tenantId, id, dto);
  }

  @RequirePermission('payroll:read')
  @Post('runs/:id/validate')
  validate(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payroll.validateRun(user.tenantId, id);
  }

  @RequirePermission('payroll:read')
  @Get('runs/:id/preview')
  preview(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payroll.previewRun(user.tenantId, id);
  }

  @RequirePermission('payroll:run')
  @Post('runs/:id/finalize')
  finalize(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizePayrollRunDto,
  ) {
    return this.payroll.finalizeRun(user.tenantId, id, dto);
  }

  @RequirePermission('payroll:read')
  @Get('trend')
  trend(@CurrentUser() user: AccessTokenPayload) {
    return this.payroll.trend(user.tenantId);
  }
}
