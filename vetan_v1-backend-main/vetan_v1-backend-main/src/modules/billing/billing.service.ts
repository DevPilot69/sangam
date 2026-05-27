import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SubscriptionStatus,
  TenantPaymentStatus,
} from '@prisma/client';
import { createHmac } from 'crypto';
import type { EnvVars } from '../../config/validate-env';
import { PrismaService } from '../../database/prisma.service';
import { buildVetanInvoiceHtml } from '../../shared/documents/vetan-invoice-html';
import type { CreateSubscriptionDto } from './dto/create-subscription.dto';
import type { VerifyPaymentDto } from './dto/verify-payment.dto';
import {
  calculateSubscriptionPrice,
  listPricingCatalog,
  periodEndFromCycle,
  type BillingCycle,
  type BillingPlanCode,
} from './billing-pricing';
import {
  createRazorpayClient,
  isRazorpayConfigured,
  type RazorpayPlanCode,
} from './razorpay.client';

type RazorpaySubscriptionEntity = {
  id: string;
  status: string;
  plan_id: string;
  current_end?: number;
  customer_id?: string;
  notes?: Record<string, string>;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  trialDays(): number {
    return this.config.get('BILLING_TRIAL_DAYS', { infer: true });
  }

  async ensureTrialSubscription(tenantId: string) {
    const existing = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });
    if (existing) return existing;

    const trialEndsAt = new Date(
      Date.now() + this.trialDays() * 24 * 60 * 60 * 1000,
    );
    return this.prisma.subscription.create({
      data: {
        tenantId,
        status: SubscriptionStatus.TRIALING,
        planCode: 'TRIAL',
        trialEndsAt,
      },
    });
  }

  getPricingCatalog() {
    return { plans: listPricingCatalog() };
  }

  getQuote(planCode: BillingPlanCode, billingCycle: BillingCycle) {
    return calculateSubscriptionPrice(planCode, billingCycle);
  }

  async getSummary(tenantId: string) {
    const sub = await this.ensureTrialSubscription(tenantId);
    const employeeCount = await this.prisma.employee.count({
      where: { tenantId, deletedAt: null, status: 'ACTIVE' },
    });
    const access = this.resolveAccess(sub);
    return {
      status: sub.status,
      planCode: sub.planCode,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      razorpaySubscriptionId: sub.razorpaySubscriptionId,
      employeeCount,
      trialDaysTotal: this.trialDays(),
      hasPaidAccess: access.allowed,
      accessReason: access.reason,
      razorpayConfigured: isRazorpayConfigured(this.config),
      razorpayKeyId: isRazorpayConfigured(this.config)
        ? this.config.get('RAZORPAY_KEY_ID', { infer: true })
        : null,
    };
  }

  resolveAccess(sub: {
    status: SubscriptionStatus;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
  }): { allowed: boolean; reason: string } {
    if (sub.status === SubscriptionStatus.ACTIVE) {
      return { allowed: true, reason: 'active_subscription' };
    }
    if (
      sub.status === SubscriptionStatus.TRIALING &&
      sub.trialEndsAt &&
      sub.trialEndsAt > new Date()
    ) {
      return { allowed: true, reason: 'trial' };
    }
    if (
      sub.status === SubscriptionStatus.PAST_DUE &&
      sub.currentPeriodEnd &&
      sub.currentPeriodEnd > new Date()
    ) {
      return { allowed: true, reason: 'grace_period' };
    }
    return { allowed: false, reason: 'subscription_required' };
  }

  async createCheckout(
    tenantId: string,
    user: { email: string; name: string },
    dto: CreateSubscriptionDto,
  ) {
    const planCode = dto.planCode as RazorpayPlanCode;
    const billingCycle = dto.billingCycle;
    const quote = calculateSubscriptionPrice(planCode, billingCycle);
    const sub = await this.ensureTrialSubscription(tenantId);

    if (!isRazorpayConfigured(this.config)) {
      return this.mockActivateSubscription(
        tenantId,
        planCode,
        billingCycle,
        quote.totalInr,
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const razorpay = createRazorpayClient(this.config);

    if (!sub.razorpayCustomerId) {
      const customer = await razorpay.customers.create({
        name: tenant.name,
        email: user.email,
        notes: { tenantId },
      });
      await this.prisma.subscription.update({
        where: { tenantId },
        data: { razorpayCustomerId: customer.id },
      });
    }

    const order = await razorpay.orders.create({
      amount: quote.amountPaise,
      currency: 'INR',
      receipt: `sub_${tenantId.slice(0, 8)}_${Date.now()}`,
      notes: {
        tenantId,
        planCode,
        billingCycle,
        totalInr: String(quote.totalInr),
      },
    });

    return {
      mock: false,
      planCode,
      billingCycle,
      quote,
      orderId: order.id,
      amount: quote.amountPaise,
      currency: 'INR',
      subscriptionId: null,
      shortUrl: null,
      status: 'created',
      keyId: this.config.get('RAZORPAY_KEY_ID', { infer: true }),
      prefill: { name: user.name, email: user.email },
    };
  }

  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const secret = this.config.get('RAZORPAY_KEY_SECRET', { infer: true });
    const expected = createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return expected === signature;
  }

  async verifyAndActivate(
    tenantId: string,
    dto: VerifyPaymentDto,
  ) {
    if (!isRazorpayConfigured(this.config)) {
      throw new BadRequestException('Razorpay is not configured');
    }
    if (
      !this.verifyPaymentSignature(
        dto.razorpay_order_id,
        dto.razorpay_payment_id,
        dto.razorpay_signature,
      )
    ) {
      throw new BadRequestException('Invalid payment signature');
    }

    const razorpay = createRazorpayClient(this.config);
    const order = (await razorpay.orders.fetch(
      dto.razorpay_order_id,
    )) as {
      notes?: Record<string, string>;
    };

    if (order.notes?.tenantId !== tenantId) {
      throw new BadRequestException('Order does not belong to this workspace');
    }

    const planCode = (order.notes?.planCode ?? 'GROWTH') as RazorpayPlanCode;
    const billingCycle = (order.notes?.billingCycle ??
      'MONTHLY') as BillingCycle;
    const totalInr = Number(order.notes?.totalInr ?? 0);

    const periodEnd = periodEndFromCycle(billingCycle);
    await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        planCode,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
        razorpaySubscriptionId: dto.razorpay_payment_id,
      },
    });
    await this.syncBillingOpsPaid(tenantId, periodEnd);
    if (totalInr > 0) {
      await this.appendPaidSubscriptionInvoice(tenantId, totalInr);
    } else {
      await this.appendPaidSubscriptionInvoice(tenantId);
    }

    return {
      ok: true,
      planCode,
      billingCycle,
      currentPeriodEnd: periodEnd.toISOString(),
    };
  }

  private async mockActivateSubscription(
    tenantId: string,
    planCode: RazorpayPlanCode,
    billingCycle: BillingCycle,
    totalInr: number,
  ) {
    const periodEnd = periodEndFromCycle(billingCycle);
    await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        planCode,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
        razorpaySubscriptionId: `mock_sub_${tenantId.slice(0, 8)}`,
      },
    });
    await this.syncBillingOpsPaid(tenantId, periodEnd);
    await this.appendPaidSubscriptionInvoice(
      tenantId,
      totalInr > 0 ? totalInr : undefined,
    );
    return {
      mock: true,
      planCode,
      billingCycle,
      quote: calculateSubscriptionPrice(planCode, billingCycle),
      orderId: null,
      amount: totalInr * 100,
      currency: 'INR',
      subscriptionId: null,
      shortUrl: null,
      status: 'active',
      keyId: null,
      message:
        'Razorpay keys not configured — subscription activated in mock mode for development.',
    };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET', { infer: true });
    if (!secret) {
      if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
        return false;
      }
      this.logger.warn(
        'RAZORPAY_WEBHOOK_SECRET not set — accepting webhook in non-production',
      );
      return true;
    }
    if (!signature) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return expected === signature;
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!this.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as {
      event: string;
      payload?: {
        subscription?: { entity: RazorpaySubscriptionEntity };
        payment?: { entity: { amount: number; currency: string } };
      };
    };

    const event = payload.event;
    const entity = payload.payload?.subscription?.entity;

    if (entity?.id) {
      await this.applyRazorpaySubscription(entity, event);
    }

    if (event === 'subscription.charged' && entity) {
      await this.recordSubscriptionCharge(entity);
    }

    return { received: true, event };
  }

  private async applyRazorpaySubscription(
    entity: RazorpaySubscriptionEntity & { customer_id?: string },
    event: string,
  ) {
    const tenantId = entity.notes?.tenantId;
    let sub = tenantId
      ? await this.prisma.subscription.findUnique({ where: { tenantId } })
      : null;

    if (!sub) {
      sub = await this.prisma.subscription.findFirst({
        where: { razorpaySubscriptionId: entity.id },
      });
    }
    if (!sub) {
      this.logger.warn(`Webhook subscription ${entity.id}: tenant not found`);
      return;
    }

    const planCode =
      entity.notes?.planCode ?? sub.planCode ?? 'GROWTH';
    let status = sub.status;
    let currentPeriodEnd = sub.currentPeriodEnd;

    if (entity.current_end) {
      currentPeriodEnd = new Date(entity.current_end * 1000);
    }

    switch (event) {
      case 'subscription.authenticated':
      case 'subscription.activated':
      case 'subscription.resumed':
        status = SubscriptionStatus.ACTIVE;
        break;
      case 'subscription.pending':
      case 'subscription.halted':
        status = SubscriptionStatus.PAST_DUE;
        break;
      case 'subscription.cancelled':
      case 'subscription.completed':
        status = SubscriptionStatus.CANCELLED;
        break;
      case 'subscription.charged':
        status = SubscriptionStatus.ACTIVE;
        break;
      default:
        if (entity.status === 'active') {
          status = SubscriptionStatus.ACTIVE;
        }
    }

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        razorpaySubscriptionId: entity.id,
        razorpayCustomerId: entity.customer_id ?? sub.razorpayCustomerId,
        status,
        planCode,
        currentPeriodEnd,
        trialEndsAt: status === SubscriptionStatus.ACTIVE ? null : sub.trialEndsAt,
      },
    });

    if (status === SubscriptionStatus.ACTIVE && currentPeriodEnd) {
      await this.syncBillingOpsPaid(sub.tenantId, currentPeriodEnd);
    }
  }

  private async recordSubscriptionCharge(entity: RazorpaySubscriptionEntity) {
    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: entity.id },
    });
    if (!sub) return;

    const amount = await this.appendPaidSubscriptionInvoice(sub.tenantId);

    this.logger.log(
      `Recorded subscription charge for tenant ${sub.tenantId}: ₹${amount}`,
    );
  }

  private async monthlyFeeForTenant(tenantId: string) {
    const ops = await this.prisma.tenantBillingOps.findUnique({
      where: { tenantId },
    });
    if (ops) return ops.monthlyFeeInr;
    return 4999;
  }

  /** Creates a paid invoice for the current calendar month (subscription SaaS fee). */
  private async appendPaidSubscriptionInvoice(
    tenantId: string,
    amountOverride?: number,
  ): Promise<number> {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });
    if (!sub) return 0;

    const now = new Date();
    const amount =
      amountOverride ?? (await this.monthlyFeeForTenant(tenantId));
    await this.prisma.invoice.create({
      data: {
        subscriptionId: sub.id,
        amount,
        currency: 'INR',
        status: 'paid',
        periodYear: now.getFullYear(),
        periodMonth: now.getMonth() + 1,
        paidAt: now,
      },
    });
    return Number(amount);
  }

  async listInvoicesForTenant(tenantId: string) {
    await this.ensureTrialSubscription(tenantId);
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      select: { id: true },
    });
    if (!sub) return [];

    const rows = await this.prisma.invoice.findMany({
      where: { subscriptionId: sub.id },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((inv) => ({
      id: inv.id,
      amount: Number(inv.amount),
      currency: inv.currency,
      status: inv.status,
      periodYear: inv.periodYear,
      periodMonth: inv.periodMonth,
      paidAt: inv.paidAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
      pdfUrl: inv.pdfUrl,
    }));
  }

  async buildInvoiceDownloadPayload(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        subscription: { tenantId },
      },
      include: {
        subscription: {
          include: { tenant: { select: { name: true, slug: true } } },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const tenant = invoice.subscription.tenant;
    const periodLabel =
      invoice.periodYear && invoice.periodMonth
        ? `${String(invoice.periodMonth).padStart(2, '0')}/${invoice.periodYear}`
        : '—';

    const html = buildVetanInvoiceHtml({
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      periodLabel,
      amountInr: Number(invoice.amount),
      currency: invoice.currency,
      paidAt: invoice.paidAt?.toISOString().slice(0, 10) ?? null,
      invoiceId: invoice.id,
      status: invoice.status,
    });

    const safePeriod = periodLabel.replace('/', '-');
    return {
      html,
      filename: `vetan-invoice-${tenant.slug}-${safePeriod}.html`,
    };
  }

  private async syncBillingOpsPaid(tenantId: string, paidThrough: Date) {
    await this.prisma.tenantBillingOps.upsert({
      where: { tenantId },
      create: {
        tenantId,
        monthlyFeeInr: 4999,
        monthlyServerCostInr: 800,
        paymentStatus: TenantPaymentStatus.PAID,
        lastPaidAt: new Date(),
      },
      update: {
        paymentStatus: TenantPaymentStatus.PAID,
        lastPaidAt: new Date(),
      },
    });
    void paidThrough;
  }
}
