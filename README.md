# Lafayette Louisiana Real Estate CRM - Phase 1

Core CRM backend and dashboard for managing real estate leads for `www.lafayettelouisianarealestate.com`.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Auth.js / NextAuth credentials login

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set `DATABASE_URL` plus `AUTH_SECRET`.

3. Run migrations and seed sample Lafayette CRM data:

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

The seed script is intended for local/demo data. In production it refuses to run unless `ALLOW_PRODUCTION_SEED=true` is set, and it only refreshes the known demo leads instead of deleting all CRM leads.

4. Start the app:

```bash
npm run dev
```

5. Sign in at `/login`.

Seeded users:

- `admin@lafayettelouisianarealestate.com` / `Password123!`
- `agent@lafayettelouisianarealestate.com` / `Password123!`

## Phase 1 Includes

- Admin and agent roles
- Protected dashboard routes
- Lead CRUD with search and filters
- Lead detail pages with notes, tasks, and activity timeline
- Pipeline stages and Kanban-style board
- Task creation, completion, overdue and today views
- Prisma models for users, leads, tasks, and activities
- Seed data for buyers, sellers, investors, and renters in Lafayette

## Phase 1.5 Multi-Tenant Foundation

The CRM is structured for individual and team lead memberships.

Tenant ownership models:

- `Organization`: an internal platform account, individual agent account, or team account.
- `Membership`: connects users to organizations with `owner`, `admin`, or `agent` roles.
- `Lead`, `Task`, and `Activity` all include `organizationId`.
- `Organization` includes billing placeholders for plan, subscription status, Stripe customer, Stripe subscription, and current period end.
- `Lead` includes distribution placeholders: `distributionStatus`, `claimedAt`, `exclusiveUntil`, `leadPriceCents`, and `marketArea`.

Current seeded organizations:

- `Lafayette Louisiana Real Estate`: internal platform organization.
- `Acadia Agent Membership`: sample individual plan.
- `Bayou Home Team`: sample team plan.

Website leads from `lafayettelouisianarealestate.com` land in the internal platform organization first. Later phases can assign, claim, or sell those leads into individual and team organizations.

## Phase 2 Notes

Public lead capture forms can post into the same `Lead` model. Keep external form endpoints separate from dashboard routes and create `Activity` rows with `type = lead_created` for each captured lead.

## Production Deployment

Recommended Phase 1 hosting:

- App: Vercel or another Node-compatible Next.js host
- Database: hosted PostgreSQL such as Neon, Supabase, Railway, Render, or managed Postgres
- Domain: `crm.lafayettelouisianarealestate.com`

Production environment variables:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require"
AUTH_SECRET="generate-a-long-random-secret"
AUTH_URL="https://crm.lafayettelouisianarealestate.com"
CRM_PUBLIC_API_KEY="same-key-used-by-wordpress-snippet"
CRM_ALLOWED_ORIGIN="https://lafayettelouisianarealestate.com"
CRM_PUBLIC_LEAD_RATE_LIMIT_PER_MINUTE="12"
CRM_PUBLIC_LEAD_MAX_BODY_BYTES="32768"
```

Production database setup:

```bash
npm run prisma:deploy
npm run prisma:seed
```

`postinstall` runs `prisma generate`, so hosted builds generate Prisma Client automatically.

## Website Lead Intake

The CRM exposes a protected public intake endpoint for `lafayettelouisianarealestate.com`:

```text
POST /api/public/leads
```

Required header:

```text
x-crm-api-key: value-from-CRM_PUBLIC_API_KEY
```

Supported JSON fields include:

```json
{
  "fullName": "Avery Thibodeaux",
  "email": "avery@example.com",
  "phone": "337-555-0202",
  "lookingTo": "buy a home",
  "source": "Buy or Sell a Home in Lafayette",
  "pageUrl": "https://lafayettelouisianarealestate.com/buy-or-sell-a-home-in-lafayette/",
  "desiredLocation": "Lafayette, LA",
  "budgetMin": "300000",
  "budgetMax": "450000",
  "timeframe": "Next 90 days",
  "message": "Interested in homes near River Ranch."
}
```

The endpoint normalizes common field names like `first_name`, `last_name`, `full_name`, `lead_type`, `budget_min`, `budget_max`, `desired_location`, and UTM fields. Each successful submission creates a new lead in the `New Lead` pipeline stage and adds a `lead_created` activity record.

Public intake hardening:

- Browser CORS requests are allowed only from `CRM_ALLOWED_ORIGIN`.
- Server-to-server requests without an `Origin` header are supported for the WordPress PHP snippet.
- API keys must be sent in the `x-crm-api-key` header or `Authorization: Bearer ...` header.
- JSON payloads are capped by `CRM_PUBLIC_LEAD_MAX_BODY_BYTES`.
- Requests are rate limited per detected client IP by `CRM_PUBLIC_LEAD_RATE_LIMIT_PER_MINUTE`.

The current WordPress site has no active form plugin installed. When a form plugin or custom form is added, configure it to send a webhook to the deployed CRM URL, for example:

```text
https://crm.lafayettelouisianarealestate.com/api/public/leads
```

A WordPress Code Snippets shortcode has been created for the site:

```text
[lafayette_lead_form]
```

Snippet details:

```text
Title: Lafayette CRM Lead Form Shortcode
Snippet ID: 9
Status: active on WordPress
Placed on: Buy or Sell a Home in Lafayette
```

After the CRM is deployed at the configured public URL, test the live WordPress form end to end and confirm the lead appears in the CRM.
