# Vetan demo data

## Quick start

```bash
cd api
npx prisma migrate deploy
npm run seed:demo
```

Demo password for all seeded users: **Demo@12345**

## Login (primary demo tenant)

| Field | Value |
|-------|--------|
| Workspace | `vetan-tech` |
| Email | `admin@vetan-tech.demo` |
| Password | `Demo@12345` |

**Roles:** Super Admin (platform), **Admin** (workspace), **Employee** (self-service). No separate HR/Finance/Manager logins.

## Employee self-service

| Field | Value |
|-------|--------|
| Workspace | `vetan-tech` |
| Email | `employee@vetan-tech.demo` |
| Password | `Demo@12345` |

Opens `/employee/dashboard` after login (payslips, leave, attendance, profile).

## Platform super admin (SaaS owner)

| Field | Value |
|-------|--------|
| URL | `/platform/login` |
| Email | `superadmin@vetan.app` |
| Password | `Demo@12345` |

Cross-tenant telemetry and tenant directory at `/platform` and `/platform/tenants`.

## Platform billing monitor

| URL | `/platform/billing` |
|-----|---------------------|

Per tenant you can track:

- **Monthly subscription fee** (what the client pays you)
- **Monthly server cost** (estimated infra overhead)
- **Payment status** — `PAID`, `UNPAID`, `OVERDUE`, `WAIVED`
- **Invoice history** (last 3 billing cycles in demo seed)

Edit values inline on the billing page after sign-in as platform admin.

## All demo tenants

- `vetan-tech` (IT, ~52 employees)
- `nova-startup` (~28)
- `bharat-manufacturing` (~120)
- `metro-retail` (~85)
- `city-care-hospital` (~95)
- `greenfield-college` (~45)
- `swift-logistics` (~65)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run seed:demo` | Seed all 7 tenants |
| `DEMO_TENANT_SLUG=vetan-tech npm run seed:demo` | Single tenant (PowerShell: `$env:DEMO_TENANT_SLUG='vetan-tech'`) |
| `npm run seed:large` | Add up to 5000 employees on `bharat-manufacturing` |
| `npm run simulate:attendance` | Append yesterday's attendance (default tenant: vetan-tech) |

## Tenant billing (Razorpay)

| URL | `/billing` (admin workspace) |
|-----|------------------------------|

With placeholder Razorpay keys in `.env`, **Subscribe** activates a mock plan. See `api/BILLING.md` for live Razorpay setup.

## Optional simulation (.env)

```env
DEMO_LATENCY_MS=200
```

Send header `x-demo-error: 500` to simulate API failure (non-production).
