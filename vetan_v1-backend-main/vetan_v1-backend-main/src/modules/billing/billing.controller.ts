import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/token.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { PrismaService } from '../../database/prisma.service';
import { BillingService } from './billing.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import type { BillingCycle, BillingPlanCode } from './billing-pricing';
import { FinancialDocumentsService } from './financial-documents.service';

@ApiTags('billing')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly prisma: PrismaService,
    private readonly financialDocs: FinancialDocumentsService,
  ) {}

  @RequirePermission('billing:read')
  @Get('payment-documents')
  paymentDocuments(@CurrentUser() user: AccessTokenPayload) {
    return this.financialDocs.listPaymentDocuments(user.tenantId);
  }

  @RequirePermission('billing:read')
  @Get('payment-documents/subscription/:invoiceId/pdf')
  async downloadSubscriptionPdf(
    @CurrentUser() user: AccessTokenPayload,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { buffer, filename } = await this.financialDocs.buildSubscriptionPdfBuffer(
      user.tenantId,
      invoiceId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @RequirePermission('billing:read')
  @Get('payment-documents/payroll/:payrollRunId/pdf')
  async downloadPayrollPdf(
    @CurrentUser() user: AccessTokenPayload,
    @Param('payrollRunId', ParseUUIDPipe) payrollRunId: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { buffer, filename } = await this.financialDocs.buildPayrollPdfBuffer(
      user.tenantId,
      payrollRunId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @RequirePermission('billing:read')
  @Get('pricing')
  pricing() {
    return this.billing.getPricingCatalog();
  }

  @RequirePermission('billing:read')
  @Get('quote')
  quote(
    @Query('planCode') planCode: string,
    @Query('billingCycle') billingCycle: string,
  ) {
    const plans = ['STARTER', 'GROWTH'] as const;
    const cycles = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'] as const;
    if (!plans.includes(planCode as (typeof plans)[number])) {
      throw new BadRequestException('Invalid planCode');
    }
    if (!cycles.includes(billingCycle as (typeof cycles)[number])) {
      throw new BadRequestException('Invalid billingCycle');
    }
    return this.billing.getQuote(
      planCode as BillingPlanCode,
      billingCycle as BillingCycle,
    );
  }

  @RequirePermission('billing:read')
  @Get()
  summary(@CurrentUser() user: AccessTokenPayload) {
    return this.billing.getSummary(user.tenantId);
  }

  @RequirePermission('billing:read')
  @Get('invoices')
  listInvoices(@CurrentUser() user: AccessTokenPayload) {
    return this.billing.listInvoicesForTenant(user.tenantId);
  }

  @RequirePermission('billing:read')
  @Get('invoices/:invoiceId/download')
  async downloadInvoice(
    @CurrentUser() user: AccessTokenPayload,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const file = await this.billing.buildInvoiceDownloadPayload(
      user.tenantId,
      invoiceId,
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    res.send(file.html);
  }

  @RequirePermission('billing:read')
  @Post('subscribe')
  async subscribe(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateSubscriptionDto,
  ) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { email: true, name: true },
    });
    if (!dbUser) {
      return this.billing.createCheckout(user.tenantId, {
        email: user.email ?? 'billing@vetan.app',
        name: 'Admin',
      }, dto);
    }
    return this.billing.createCheckout(user.tenantId, dbUser, dto);
  }

  @RequirePermission('billing:read')
  @Post('verify-payment')
  verifyPayment(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.billing.verifyAndActivate(user.tenantId, dto);
  }
}
