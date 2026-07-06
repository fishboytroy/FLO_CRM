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
- `Lead.zipCode` captures the future allocation ZIP, and organization owners/admins can manage sample purchased territories at `/dashboard/settings/territories`.
- Manual review leads that need ZIP/territory review are visible at `/dashboard/leads/review`.
- Platform admins can create controlled validation organizations, memberships, and ZIP territories at `/dashboard/platform/organizations`.

Current seeded organizations:

- `Lafayette Louisiana Real Estate`: internal platform organization.
- `Acadia Agent Membership`: sample individual plan.
- `Bayou Home Team`: sample team plan.

Website leads from `lafayettelouisianarealestate.com` land in the internal platform organization first. Later phases can assign, claim, or sell those leads into individual and team organizations.

## Phase 2 Notes

Public lead capture forms can post into the same `Lead` model. Keep external form endpoints separate from dashboard routes and create `Activity` rows with `type = lead_created` for each captured lead.

Membership and zip-code allocation planning is documented in:

```text
docs/membership-and-zip-code-allocation.md
```

Team and paid organization validation is documented in:

```text
docs/team-paid-organization-validation.md
```

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
CRM_APP_URL="https://crm.lafayettelouisianarealestate.com"
CRM_EMAIL_FROM="crm@lafayettelouisianarealestate.com"
CRM_EMAIL_FROM_NAME="Lafayette Real Estate CRM"
CRM_NOTIFICATION_FALLBACK_EMAIL="admin@lafayettelouisianarealestate.com"
BREVO_API_KEY="provider-api-key-placeholder"
```

Production database setup:

```bash
npm run prisma:deploy
```

`postinstall` runs `prisma generate`, so hosted builds generate Prisma Client automatically.

Do not run `prisma migrate dev`, `prisma migrate reset`, or destructive seed commands against production. Production deployment and live lead-intake troubleshooting are documented in:

```text
docs/production-deployment-troubleshooting.md
```

## Website Lead Intake

The CRM exposes a protected public intake endpoint for `lafayettelouisianarealestate.com`:

```text
POST /api/public/leads
```

Required header:

```text
x-crm-api-key: value-from-CRM_PUBLIC_API_KEY
```

Production URL:

```text
https://crm.lafayettelouisianarealestate.com/api/public/leads
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

Native CRM notifications:

- New non-duplicate public leads trigger CRM-side email notifications when `CRM_EMAIL_FROM` and `BREVO_API_KEY` are configured.
- Clear duplicate submissions are recorded as lead activity and do not send new-lead notifications.
- `CRM_APP_URL` is used to include lead-detail links in notification emails.
- If no organization recipient is found, `CRM_NOTIFICATION_FALLBACK_EMAIL` can receive fallback notifications.

Live WordPress integration:

- The homepage lead form posts to WordPress `admin-ajax.php`.
- The active WordPress snippet validates the form, then sends server-side JSON to the CRM public intake endpoint.
- The API key must stay server-side in WordPress/PHP and must not be exposed in browser JavaScript.
- GoDaddy Managed WordPress cache should be flushed after snippet changes.

Operational boundary:

- WordPress is the public lead capture surface.
- The Next.js app is the CRM backend and admin dashboard surface.

Active WordPress Code Snippets:

- `Homepage Funnel Hero Photo Router - Magnolia Move`, snippet ID `8`: live homepage form and CRM handoff.
- `Lafayette CRM Lead Form Shortcode`, snippet ID `9`: `[lafayette_lead_form]` shortcode path.
- `Lafayette CRM Demo Form Submitter`, snippet ID `10`: demo form path.

See the full runbook:

```text
docs/wordpress-lead-intake.md
```

For production Vercel, Supabase, WordPress, API key, migration, ZIP-routing, and notification troubleshooting, see:

```text
docs/production-deployment-troubleshooting.md
```

## Lead Notifications

Native CRM email notifications are documented in:

```text
docs/lead-notifications.md
```

Use that runbook to configure Brevo environment variables, verify live delivery, and troubleshoot notification issues without exposing secrets.
