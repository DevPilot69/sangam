import Razorpay from 'razorpay';
import type { ConfigService } from '@nestjs/config';
import type { EnvVars } from '../../config/validate-env';

export type RazorpayPlanCode = 'STARTER' | 'GROWTH';

export function isRazorpayConfigured(config: ConfigService<EnvVars, true>): boolean {
  const id = config.get('RAZORPAY_KEY_ID', { infer: true });
  const secret = config.get('RAZORPAY_KEY_SECRET', { infer: true });
  return (
    Boolean(id && secret) &&
    !id.includes('placeholder') &&
    secret !== 'placeholder'
  );
}

export function createRazorpayClient(
  config: ConfigService<EnvVars, true>,
): Razorpay {
  return new Razorpay({
    key_id: config.get('RAZORPAY_KEY_ID', { infer: true }),
    key_secret: config.get('RAZORPAY_KEY_SECRET', { infer: true }),
  });
}

export function planIdForCode(
  config: ConfigService<EnvVars, true>,
  planCode: RazorpayPlanCode,
): string | undefined {
  if (planCode === 'STARTER') {
    return config.get('RAZORPAY_PLAN_STARTER', { infer: true });
  }
  return config.get('RAZORPAY_PLAN_GROWTH', { infer: true });
}
