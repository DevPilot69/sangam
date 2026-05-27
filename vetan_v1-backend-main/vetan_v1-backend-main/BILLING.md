# Vetan billing (Razorpay)

Tenant subscriptions are billed through **Razorpay Subscriptions**. Platform ops billing (`/platform/billing`) remains a separate internal cost monitor.

## Environment

Add to `api/.env`:

```env
RAZORPAY_KEY_ID=rzp_live_xxx          # or rzp_test_xxx
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=whsec_xxx     # from Razorpay Dashboard → Webhooks
RAZORPAY_PLAN_STARTER=plan_xxx        # Dashboard → Subscriptions → Plans
RAZORPAY_PLAN_GROWTH=plan_xxx
BILLING_TRIAL_DAYS=14
```

If `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are placeholders, **Subscribe** on `/billing` activates a mock plan locally (no payment).

## Razorpay setup

1. Create a [Razorpay account](https://dashboard.razorpay.com) and complete KYC for live mode.
2. **Subscriptions → Plans** — create monthly plans (e.g. Starter ₹2,999, Growth ₹7,999). Copy plan IDs into `.env`.
3. **Settings → Webhooks** — add endpoint:
   - Local (ngrok): `https://<tunnel>/v1/billing/webhooks/razorpay`
   - Production: `https://api.yourdomain.com/v1/billing/webhooks/razorpay`
4. Enable events: `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`.
5. Copy webhook secret to `RAZORPAY_WEBHOOK_SECRET`.

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/billing` | Tenant JWT + `billing:read` | Subscription summary |
| POST | `/v1/billing/subscribe` | Tenant JWT + `billing:read` | Body: `{ "planCode": "STARTER" \| "GROWTH" }` |
| POST | `/v1/billing/webhooks/razorpay` | Razorpay signature | Webhook (no JWT) |

## Tenant UI

Admins open **Billing** in the sidebar → choose plan → Razorpay hosted checkout (`short_url`) or dev mock activation.

## Trial

New signups get `Subscription` with `status: TRIALING` and `trialEndsAt` = now + `BILLING_TRIAL_DAYS` (default 14).
