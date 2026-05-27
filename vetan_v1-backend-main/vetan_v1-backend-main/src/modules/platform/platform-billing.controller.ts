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
import { TenantPaymentStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlatformAuthGuard } from './guards/platform-auth.guard';
import { PlatformBillingService } from './platform-billing.service';

class BillingListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TenantPaymentStatus)
  paymentStatus?: TenantPaymentStatus;
}

class PatchBillingOpsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyFeeInr?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyServerCostInr?: number;

  @IsOptional()
  @IsEnum(TenantPaymentStatus)
  paymentStatus?: TenantPaymentStatus;

  @IsOptional()
  @IsDateString()
  lastPaidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  billingNotes?: string;
}

@ApiTags('platform')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PlatformAuthGuard)
@Controller('platform/billing')
export class PlatformBillingController {
  constructor(private readonly billing: PlatformBillingService) {}

  @Get('overview')
  overview() {
    return this.billing.getOverview();
  }

  @Get('tenants')
  listTenants(@Query() query: BillingListQueryDto) {
    return this.billing.listTenants({
      search: query.search,
      paymentStatus: query.paymentStatus,
    });
  }

  @Get('tenants/:tenantId')
  tenantBilling(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.billing.getTenantBilling(tenantId);
  }

  @Patch('tenants/:tenantId')
  patchBilling(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: PatchBillingOpsDto,
  ) {
    return this.billing.updateTenantBilling(tenantId, {
      monthlyFeeInr: dto.monthlyFeeInr,
      monthlyServerCostInr: dto.monthlyServerCostInr,
      paymentStatus: dto.paymentStatus,
      lastPaidAt: dto.lastPaidAt,
      billingNotes: dto.billingNotes,
    });
  }
}
