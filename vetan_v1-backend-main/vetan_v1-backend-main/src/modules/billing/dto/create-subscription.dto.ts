import { IsIn, IsString } from 'class-validator';
import type { BillingCycle } from '../billing-pricing';

export class CreateSubscriptionDto {
  @IsString()
  @IsIn(['STARTER', 'GROWTH'])
  planCode!: 'STARTER' | 'GROWTH';

  @IsString()
  @IsIn(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'])
  billingCycle!: BillingCycle;
}
