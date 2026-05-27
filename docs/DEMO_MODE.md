# Demo Mode → Real Integration Switch Guide

`DEMO_MODE` is the single environment flag that toggles every external
integration between an in-process mock and the real provider. The point of
the design is: **flip env vars, no code change**.

```
DEMO_MODE=true   # everything mocked, demoable end-to-end with no third-party accounts
DEMO_MODE=false  # production: every helper falls through to the real SDK
```

Each integration also honours its own narrower switch so you can flip them
independently when you're rolling out one provider at a time (e.g. wire
SendGrid first while Razorpay stays mocked).

| Capability             | Demo behaviour                                                            | Prod env vars to flip                                                                                                          | File to look at                                            |
| ---------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Email (SendGrid)       | Written to `MockEmail` table; viewable at `/platform/inbox`               | `DEMO_MODE=false`, `SENDGRID_API_KEY=…`, `EMAIL_FROM=…`                                                                        | `packages/demo/src/email.ts`                               |
| Object storage (Blob)  | Metadata stored in DB; downloads serve a placeholder PDF                  | `DEMO_MODE=false`, `BLOB_READ_WRITE_TOKEN=…` (Vercel Blob) **or** `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_KEY` | `packages/demo/src/storage.ts`                             |
| PDF (payslip, invoice) | Returns 302 to `public/samples/sample-payslip.pdf` / `sample-invoice.pdf` | `DEMO_MODE=false` — enables real `pdfkit` rendering path                                                                       | `packages/demo/src/pdf.ts`                                 |
| Razorpay (billing)     | Synthetic order IDs; `verifyPayment` always succeeds; webhook synthesiser | `DEMO_MODE=false`, `RAZORPAY_KEY_ID=…`, `RAZORPAY_KEY_SECRET=…`, `RAZORPAY_WEBHOOK_SECRET=…`                                   | `packages/demo/src/razorpay.ts`                            |
| Biometric attendance   | Vercel Cron seeds realistic daily punches at 03:00 UTC                    | `DEMO_MODE=false`, `BIOMETRIC_API_URL=…`, `BIOMETRIC_API_TOKEN=…` (your vendor); remove cron from `vercel.json` once live      | `packages/demo/src/biometric.ts`, `apps/web/vercel.json`   |
| Rate limit             | In-memory per-lambda fallback                                             | `UPSTASH_REDIS_REST_URL=…`, `UPSTASH_REDIS_REST_TOKEN=…` — automatically picked up, no `DEMO_MODE` needed                      | `packages/api-kit/src/rate-limit.ts`                       |
| Error reporting        | Logged to stdout only                                                     | `SENTRY_DSN=…` (+ optional `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` for source maps)                                | `apps/web/sentry.server.config.ts`                         |
| Structured logs        | pino → stdout (JSON lines, ingested by Vercel Logs / Axiom natively)      | `LOG_LEVEL=info` (default in prod), `LOG_LEVEL=debug` (default in dev)                                                         | `packages/api-kit/src/logger.ts`                           |

## Cutover sequence (recommended order)

When you're moving from "demo" → "real" piece by piece, do them in this
order so the blast radius of each flip is small:

1. **Upstash Redis** — set the two `UPSTASH_REDIS_REST_*` env vars. Rate limit
   now works across lambdas. No `DEMO_MODE` change.
2. **Sentry** — set `SENTRY_DSN`. Errors start flowing in. No `DEMO_MODE` change.
3. **SendGrid** — set `SENDGRID_API_KEY` + `EMAIL_FROM`. `MockEmail` rows stop
   appearing. The `/platform/inbox` page is still useful for old demo data.
4. **Object storage** — set Vercel Blob / S3 creds. New uploads go to the real
   bucket; old demo uploads keep serving the placeholder PDF (look up by id
   in `mockUpload` table and re-upload if needed).
5. **PDF (pdfkit)** — flip `DEMO_MODE=false`. Real payslip / invoice PDFs
   start generating. Watch the per-route maxDuration; if you see 60s+ runs
   add the route to `vercel.json#functions`.
6. **Razorpay** — set the three Razorpay env vars. Plug the live webhook URL
   into your Razorpay dashboard. Subscribe an internal test account first,
   then enable for real tenants.
7. **Biometric attendance** — set your vendor's API creds. Remove the
   `/v1/_cron/seed-attendance` entry from `vercel.json#crons` so the demo
   seeder stops fighting the real ingestion.

## Verifying a switch

After flipping a provider:

```bash
# 1. Confirm the env var is actually set on the deployment:
vercel env ls --environment production | grep -i <prefix>

# 2. Hit /v1/_health — should still return ok.
curl https://<your>.vercel.app/v1/_health

# 3. Watch one structured log line per request:
vercel logs --tail

# 4. For Razorpay/SendGrid: trigger one real-world action (a paid signup,
#    a forgot-password) and check the provider dashboard for the event.
```

## Local development

`.env.example` ships with `DEMO_MODE=true`. You can run the whole stack
against Neon with zero third-party accounts; just paste your `DATABASE_URL`
and `JWT_SECRET` and you're done.

If you want to test one integration against a real account locally, override
just that integration's env vars in `.env.local`:

```bash
# Keep everything else mocked, but test real SendGrid locally:
DEMO_MODE=true               # keep mocks for the rest
SENDGRID_API_KEY=SG.…        # but this one overrides the email mock if SDK call paths skip the DEMO_MODE gate
EMAIL_FROM=noreply@you.dev
```

(Note: at the moment each provider mock is gated *purely* on `DEMO_MODE`. If
you need per-provider overrides during transitional rollouts, the right
place to add the check is in `packages/demo/src/<provider>.ts` —
`isXyzConfigured()` already exists for several of them.)
