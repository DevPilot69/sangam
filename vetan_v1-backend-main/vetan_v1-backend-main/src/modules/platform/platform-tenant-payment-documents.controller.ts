import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { FinancialDocumentsService } from '../billing/financial-documents.service';
import { PlatformAuthGuard } from './guards/platform-auth.guard';

@ApiTags('platform')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PlatformAuthGuard)
@Controller('platform/tenants/:tenantId/payment-documents')
export class PlatformTenantPaymentDocumentsController {
  constructor(private readonly financialDocs: FinancialDocumentsService) {}

  @Get()
  list(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.financialDocs.listPaymentDocuments(tenantId);
  }

  @Get('subscription/:invoiceId/pdf')
  async downloadSubscriptionPdf(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { buffer, filename } = await this.financialDocs.buildSubscriptionPdfBuffer(
      tenantId,
      invoiceId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('payroll/:payrollRunId/pdf')
  async downloadPayrollPdf(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('payrollRunId', ParseUUIDPipe) payrollRunId: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { buffer, filename } = await this.financialDocs.buildPayrollPdfBuffer(
      tenantId,
      payrollRunId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
