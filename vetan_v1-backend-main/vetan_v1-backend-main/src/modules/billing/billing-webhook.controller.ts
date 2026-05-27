import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller('billing/webhooks')
export class BillingWebhookController {
  constructor(private readonly billing: BillingService) {}

  @Post('razorpay')
  razorpay(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signature: string | undefined,
  ) {
    const body = req.body;
    const raw = Buffer.isBuffer(body)
      ? body
      : Buffer.from(
          typeof body === 'string' ? body : JSON.stringify(body ?? {}),
          'utf8',
        );
    if (!raw.length) {
      throw new BadRequestException('Missing raw body for webhook verification');
    }
    return this.billing.handleWebhook(raw, signature);
  }
}
