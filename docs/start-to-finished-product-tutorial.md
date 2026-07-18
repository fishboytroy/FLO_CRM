# Lafayette CRM + WordPress Lead Funnel: Start-To-Finished Product Tutorial

This is the clean build path for recreating the Lafayette Louisiana Real Estate CRM and website lead funnel without the exploratory back-and-forth from the original build.

## 1. Product Architecture

The product has two public surfaces and one private operating system:

- WordPress website: public marketing pages and lead forms at `lafayettelouisianarealestate.com`.
- CRM app: private dashboard at `crm.lafayettelouisianarealestate.com`.
- Supabase Postgres: production database for organizations, users, leads, territories, invites, notes, tasks, and routing history.

Flow:

1. Visitor lands on the WordPress site.
2. Visitor submits a buyer, seller, or agent membership form.
3. CRM receives lead data or WordPress sends a membership inquiry email.
4. Supabase stores CRM records.
5. CRM routes leads by ZIP membership, organization, and assigned agent.
6. Brevo sends notification emails.
7. Vercel hosts and redeploys the CRM.
8. MCP connections let Codex inspect WordPress, Supabase, GitHub, Vercel, and local project state.

## 2. Product Planning

Core modules:

- Authentication and role-based dashboard access.
- Platform admin organization management.
- Paid organization records for individual agents and teams.
- ZIP territory memberships.
- Public lead intake with origin/API-key protection.
- Lead routing to owners, teams, or manual review.
- Email notifications.
- Member invite and password setup flow.
- WordPress lead capture and membership inquiry forms.
- Backup and recovery process.

Core roles:

- Platform admin: manages organizations, territories, members, and routing.
- Owner: owns an individual or team organization.
- Admin: manages a team organization.
- Agent: receives assigned leads and works pipeline/tasks.

## 3. Local Software Setup

Install:

- Git
- Node.js LTS
- VS Code or preferred editor
- PostgreSQL for local development if using a local database
- Codex desktop

Clone the CRM repo:

```powershell
git clone https://github.com/fishboytroy/FLO_CRM.git
cd FLO_CRM
npm install
```

Generate Prisma client:

```powershell
npm run prisma:generate
```

## 4. PostgreSQL And Supabase

For local-only development, a local PostgreSQL URL can look like:

```text
postgresql://postgres:[password]@localhost:5432/lafayette_crm?schema=public
```

For production Supabase, use the shared pooler string:

```text
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

Use the shared pooler when local networks or hosts are IPv4-only. The direct database host may require IPv6 or a paid IPv4 add-on.

Run migrations:

```powershell
npx prisma migrate deploy
```

For local migration development:

```powershell
npm run prisma:migrate
```

## 5. Paid Services

Create or configure:

- Vercel: hosts the Next.js CRM.
- Supabase: Postgres database and security advisor checks.
- Brevo: transactional email API.
- WordPress hosting: public website.
- Stripe: payment system for future paid memberships.
- GitHub: source recovery and collaboration.

## 6. Environment Variables

Local `.env` belongs on the developer machine only. Vercel environment variables belong in the Vercel project.

Important CRM values:

```text
DATABASE_URL=
AUTH_SECRET=
AUTH_URL=https://crm.lafayettelouisianarealestate.com
CRM_ALLOWED_ORIGIN=https://lafayettelouisianarealestate.com
CRM_PUBLIC_API_KEY=
BREVO_API_KEY=
CRM_EMAIL_FROM=
CRM_EMAIL_FROM_NAME=
CRM_APP_URL=https://crm.lafayettelouisianarealestate.com
CRM_NOTIFICATION_FALLBACK_EMAIL=admin@lafayettelouisianarealestate.com
```

Rules:

- Do not commit `.env`.
- Rotate exposed credentials.
- Use the same production values in Vercel that the deployed CRM expects.
- Redeploy Vercel after changing production environment variables.

## 7. API Keys

Supabase:

- Use the database password inside `DATABASE_URL`.
- Use project ref in the Supabase MCP URL.
- Keep service-role keys out of browser-exposed code.

Brevo:

- Create an SMTP/API key in Brevo.
- Put it in `BREVO_API_KEY` for the CRM.
- Configure WP Mail SMTP with the working Brevo key for WordPress mail.

CRM public intake:

- Generate a strong random `CRM_PUBLIC_API_KEY`.
- Store it in local `.env` and Vercel.
- Use it only for trusted public intake JavaScript/server handoff paths.

## 8. MCP Connections

Codex MCP config lives in:

```text
C:\Users\captt\.codex\config.toml
```

Important MCP entries:

```toml
[mcp_servers.my-wordpress-site]
command = "npx"
args = ["-y", "mcp-remote", "https://lafayettelouisianarealestate.com/wp-json/mcp/mcp-adapter-default-server", "--header", "Authorization: Bearer [TOKEN]"]

[mcp_servers.supabase]
url = "https://mcp.supabase.com/mcp?project_ref=vnjyiibjyvpckralxdnp&read_only=true"
```

Use MCP for:

- WordPress page/plugin/snippet inspection.
- Supabase logs/docs/types.
- GitHub source checks.
- Vercel deployment/log inspection.

## 9. WordPress Website Integration

Current WordPress site:

- Domain: `https://lafayettelouisianarealestate.com`
- Active theme observed: `lafayette-real-estate-ai-theme`
- WP Mail SMTP uses Brevo.
- Code Snippets plugin is used for controlled frontend changes.

Important membership snippets:

- Membership inquiry form posts to `wp-admin/admin-post.php`.
- Email recipient: `admin@lafayettelouisianarealestate.com`.
- Animated funnel visual explains traffic, qualification, CRM routing, and agent follow-up.
- Platform panel positions the offer as a Lafayette/Acadiana AI-assisted CRM membership engine.

## 10. CRM Deployment

Build locally:

```powershell
npm run build
```

Run tests:

```powershell
npm test
```

Deploy through Vercel after code or production env changes.

Verify:

- `/login`
- `/dashboard`
- `/dashboard/platform/organizations`
- `/api/public/leads`
- Lead routing to the right org/agent.
- Email notification delivery.

## 11. Supabase Security

Address Supabase security advisor warnings:

- Enable Row Level Security where applicable.
- Avoid public unrestricted table access.
- Restrict sensitive columns.
- Keep public API access limited to explicit application endpoints.

## 12. Backups

Local backup target:

```text
E:\Lafayette-CRM-Backups
```

Reusable command:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\create-local-backup.ps1 -DestinationRoot E:\Lafayette-CRM-Backups
```

The script backs up:

- CRM source, docs, Prisma schema/migrations, tests, config examples.
- Public WordPress snapshots and public WordPress REST data.
- Backup README files and manifest.

It intentionally excludes:

- `.env`
- local secrets
- `node_modules`
- `.next`
- `.git`
- `.vercel`

Full WordPress backup still requires hosting backup, SFTP/SSH, a backup plugin export, or database export.

## 13. Verification Checklist

Before calling the product ready:

- CRM build passes.
- Tests pass.
- Vercel production deploy is current.
- Supabase migrations are applied.
- WordPress forms render on desktop and phone.
- Public lead test reaches CRM.
- Agent membership inquiry test sends email.
- Melanie/National Realty receives lead notifications.
- Backups exist on `E:`.
- GitHub has current source commits.

