import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingService } from './billing.service';
import { FinancialDocumentsService } from './financial-documents.service';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService, FinancialDocumentsService],
  exports: [BillingService, FinancialDocumentsService],
})
export class BillingModule {}
