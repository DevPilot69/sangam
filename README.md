# Sangam

Multi-tenant payroll SaaS, deployed as a single Next.js app on Vercel against Neon Postgres.

## Layout (monorepo, npm workspaces + Turborepo)

```
sangam/
  apps/
    web/                    # the only Vercel deployable (Next.js)
  packages/
    db/                     # @sangam/db — Prisma schema, generated client, migrations, seed
    contracts/              # @sangam/contracts — Zod schemas + shared types (ported DTOs)
    api-kit/                # @sangam/api-kit — withApi, requireAuth, validate, rateLimit, withRawBody
    demo/                   # @sangam/demo — env-gated mock providers (Razorpay, SendGrid, storage, pdf, biometric)
```

## Prerequisites

- Node `>=20` (works on 22.x)
- npm `>=10`
- A Neon Postgres project ([neon.tech](https://neon.tech)) — capture both the **pooled** and **direct** connection strings.

## Quick start (local)

```bash
cp .env.example .env.local
# Edit .env.local: paste your Neon DATABASE_URL (pooled) and DIRECT_DATABASE_URL.

npm install
npm run db:generate
npm run db:migrate    # applies migrations against DIRECT_DATABASE_URL
npm run db:seed       # optional — seed demo data

npm run dev
# -> http://localhost:3000
```

## Scripts

- `npm run dev` — runs all packages in dev (Turbo-powered)
- `npm run build` — builds everything in dependency order
- `npm run typecheck`
- `npm run lint`
- `npm run db:generate` — regenerates `@prisma/client` into `packages/db`
- `npm run db:migrate` — `prisma migrate deploy` against Neon (uses `DIRECT_DATABASE_URL`)
- `npm run db:studio` — opens Prisma Studio
- `npm run db:seed` — runs `packages/db/prisma/seed.ts`

## Demo mode

Set `DEMO_MODE=true` (default in `.env.example`) and all third-party integrations are stubbed:

- **Razorpay** — `createOrder` returns synthetic IDs; `verifyPayment` always succeeds; webhook can be triggered from an admin button.
- **SendGrid** — emails written to the `MockEmail` table; readable at `/platform/inbox`.
- **File uploads** — metadata stored, downloads serve a sample PDF from `apps/web/public/samples/`.
- **PDFs (payslips/invoices)** — pre-baked sample files served instead of pdfkit output.
- **Biometric attendance** — Vercel Cron seeds realistic daily punches; manual "Simulate today" button in the attendance UI.

Flip `DEMO_MODE=false` and supply real credentials to wire each integration for real, module-by-module, no code change required.

## Deployment (Vercel)

1. Connect this repo to a Vercel project.
2. Set the **Root Directory** to `apps/web`.
3. Set the **Build Command** to `cd ../.. && npm run build` (Turbo will scope to web's deps).
4. Set the **Install Command** to `npm install --workspaces` from the workspace root.
5. Paste env vars (see `.env.example`).
6. First deploy: hit `https://<your>.vercel.app/v1/_health` — should return `{ ok: true, db: "ok" }`.

## Migration history

This repo is the merged successor of:

- `vetan_v1-frontend-main/` (Next.js 16) — now `apps/web/`
- `vetan_v1-backend-main/` (NestJS 11) — being ported phase-by-phase into `apps/web/src/server/**` and `apps/web/src/app/v1/**`

See [the migration plan](https://github.com/) and the per-phase notes in `docs/MIGRATION.md` (added in Phase 5).
