# Deploy Vetan API on Render

Repository: [vetan_v1-backend](https://github.com/harshbrickred-ctrl/vetan_v1-backend)

## Render Web Service settings

| Setting | Value |
|---------|--------|
| **Root Directory** | *(leave empty — repository root)* |
| **Build Command** | `npm ci --include=dev && npm run build:render` |
| **Start Command** | `npm run start:render` |
| **Health Check Path** | `/health` |

Do **not** use `npm run start` (`nest start`) in production — it compiles at runtime and can OOM on small instances.

## Required environment variables

Copy from `.env.example` and set in Render → **Environment**:

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Production Vercel URL, e.g. `https://vetan-v1-frontend.vercel.app` (preview `*.vercel.app` hosts with the same prefix are allowed automatically) |
| `CORS_EXTRA_ORIGINS` | Optional comma-separated extra origins |
| `DATABASE_URL` | Render Postgres **Internal** URL (link DB to service) |
| `JWT_SECRET` | ≥ 32 random characters |
| `JWT_REFRESH_SECRET` | ≥ 32 random characters, different from above |
| `AWS_S3_BUCKET` | Placeholder OK until S3 is implemented |
| `SENDGRID_API_KEY` | Placeholder OK if email not needed |

Optional: `RAZORPAY_*` (test keys for demo), `BILLING_TRIAL_DAYS=14`.

**Do not set `PORT`** — Render injects it automatically.

**Do not set `DEV_AUTH_VERBOSE=true`** in production.

## PostgreSQL

1. Create a Render **PostgreSQL** database in the same region as the API.
2. Link it to the web service or paste the **Internal Database URL** as `DATABASE_URL`.
3. Migrations run automatically via `npm run start:render` (`prisma migrate deploy`).

## Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com
```

No `/v1` suffix — the client adds it.

## Verify

- `GET https://<api-host>/health` → `{ "status": "ok" }`
- `https://<api-host>/api/docs` → Swagger UI

## Cross-origin auth

Production refresh cookies use `SameSite=None; Secure` so Vercel → Render refresh works.

## Blueprint

Optional: deploy with `render.yaml` from this repo (adjust service/database names as needed).
