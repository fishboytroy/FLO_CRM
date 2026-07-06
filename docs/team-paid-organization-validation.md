# Team and Paid Organization Validation Plan

This runbook validates whether the CRM is ready to support paid ZIP territory onboarding for individual and team accounts.

Scope:

- Individual memberships.
- Team memberships.
- Owner/admin/agent permissions.
- Purchased ZIP territories.
- Public lead routing to non-internal organizations.
- Team-level lead assignment behavior.

Non-goals:

- Do not add billing.
- Do not add subscriptions.
- Do not add SMS.
- Do not add automation.
- Do not change public lead intake behavior unless a bug is confirmed.
- Do not change ZIP routing logic unless a bug is confirmed.
- Do not run destructive seed commands.
- Do not run `prisma migrate reset`.

## Current Implementation Status

The schema and core routing logic already support the intended membership model:

- `Organization.plan` supports `internal`, `individual`, and `team`.
- `Membership.role` supports `owner`, `admin`, and `agent`.
- `OrganizationZipCode` stores purchased or controlled territories.
- `Lead.zipCode` stores the allocation ZIP.
- `Lead.assignedAgentId` remains the assigned CRM user field.
- `LeadAssignmentHistory` records routing decisions.
- Public lead intake routes by active/trialing exclusive ZIP territory.
- Individual organization leads assign to the single owner when clear.
- Team organization leads remain unassigned for admin review.
- Native email notifications go to assigned user first, then owner/admin recipients.
- Agent users cannot manage ZIP territories.
- Owner/admin users can manage ZIP territories for their active organization.

Existing tests cover much of the pure business logic:

- Individual ZIP match routing.
- Team ZIP match routing.
- Missing/unpurchased/conflicting ZIP fallback.
- Owner assignment for individual organizations.
- Null assignment for team organizations.
- Territory conflict messages.
- Territory role permissions.
- Owner/admin notification recipients.
- Agent exclusion from team new-lead notifications.
- Duplicate lead behavior scoped by organization.

## Important Current Gaps

These gaps matter before selling paid ZIP territories:

- A minimal platform-admin onboarding UI exists, but there is not a full platform-admin product.
- Platform-admin membership creation is available for controlled onboarding, but ongoing team member self-management is not implemented.
- There is no active organization switcher for users with multiple memberships.
- Territory management works for the current active organization only.
- Team member management is not implemented in the UI.
- A database-level partial unique index does not yet enforce active exclusive ZIP uniqueness.
- The seed script creates sample individual/team organizations locally, but it is not a targeted production onboarding tool.
- Production data setup should not be done with broad seed commands.

Because of these gaps, controlled production validation should use intentionally created test records only after the owner approves the exact organizations, users, emails, and ZIPs.

## Validation Data Model

Use two unused test ZIP territories that do not overlap with any active/trialing territory.

Recommended placeholders:

- Individual test ZIP: `<INDIVIDUAL_TEST_ZIP>`
- Team test ZIP: `<TEAM_TEST_ZIP>`

Do not use a ZIP already active/trialing for the internal Lafayette organization or any paid organization.

### Individual Account Test Shape

Organization:

- `Organization.plan = individual`
- `Organization.status = active` or `trialing`
- `Organization.subscriptionStatus = active` or `trialing`

Memberships:

- One owner membership.

Territory:

- One active exclusive `OrganizationZipCode` for `<INDIVIDUAL_TEST_ZIP>`.

Expected routing:

- Public lead with `<INDIVIDUAL_TEST_ZIP>` routes to this organization.
- `Lead.assignedAgentId` is set to the owner user.
- `LeadAssignmentHistory.reason = zip_match`.
- Notification goes to the assigned owner.

### Team Account Test Shape

Organization:

- `Organization.plan = team`
- `Organization.status = active` or `trialing`
- `Organization.subscriptionStatus = active` or `trialing`

Memberships:

- One owner membership.
- One admin membership.
- One agent membership.

Territory:

- One active exclusive `OrganizationZipCode` for `<TEAM_TEST_ZIP>`.

Expected routing:

- Public lead with `<TEAM_TEST_ZIP>` routes to this organization.
- `Lead.assignedAgentId` remains `null`.
- `LeadAssignmentHistory.reason = zip_match`.
- Notification goes to owner/admin recipients.
- Agent does not receive notification unless rules change later.

## Safe Setup Options

### Option A: Platform Admin Onboarding UI

Use this controlled dashboard path when a platform admin account is available:

```text
/dashboard/platform/organizations
```

Access is limited to users with `User.role = platform_admin`. Regular organization owners, admins, and agents should not be able to open this page or call the matching platform API routes.

The page supports targeted setup only:

- Create an `individual` or `team` organization.
- Add an owner, admin, or agent membership by user email.
- Create a user record without a password only when the email does not already exist.
- Assign an active/trialing/expired/canceled exclusive ZIP territory.
- View member counts, ZIP territory counts, recent leads, current members, and current territories.

The page intentionally does not support:

- Billing setup.
- Subscriptions.
- SMS.
- Automation.
- Invitation emails.
- Organization deletion.
- User deletion.
- ZIP territory deletion.

When assigning active or trialing exclusive ZIP territories, the platform route reuses the same conflict helper as the organization territory settings page. A ZIP already owned by another active/trialing exclusive territory is blocked.

Use fake or owner-controlled test emails. Do not use real customer data for validation.

### Option B: Local or Non-Production Validation

Use this first when possible.

1. Confirm the local database is not production.
2. Run migrations if needed.
3. Run the guarded seed script only in local/non-production.
4. Add or adjust local test territories using the dashboard or Prisma tooling.
5. Use test leads with fake emails and phones.
6. Validate routing, assignment, duplicates, and UI visibility locally.

The existing seed creates:

- `Acadia Agent Membership` as a sample individual account.
- `Bayou Home Team` as a sample team account.

The seed does not fully create a team admin and team agent membership. Add those only in local/non-production or through a controlled production setup.

### Option C: Controlled Production Validation

Use this only with owner approval.

Requirements before production setup:

- Pick two unused ZIPs.
- Pick fake or owner-controlled test emails.
- Confirm no active/trialing territory already owns those ZIPs.
- Confirm Brevo notification recipients are acceptable.
- Confirm cleanup expectations before submitting test leads.

Do not run `npm run prisma:seed` against production.

Production setup should create only:

- One test individual organization.
- One owner user/membership for that individual organization.
- One test team organization.
- One owner membership, one admin membership, and one agent membership for the team organization.
- One active exclusive ZIP territory per test organization.

If no safe production write path is available, stop and do not create records. The missing tool/admin workflow should be treated as a product gap.

### Guarded Setup Script

The repo includes a targeted validation setup script:

```bash
npm run validation:paid-orgs
```

The script is dry-run by default. It prints the intended individual/team organizations, members, and ZIP territories without writing records.

Required environment values:

- `PAID_VALIDATION_INDIVIDUAL_ZIP`
- `PAID_VALIDATION_TEAM_ZIP`
- `PAID_VALIDATION_INDIVIDUAL_OWNER_EMAIL`
- `PAID_VALIDATION_TEAM_OWNER_EMAIL`
- `PAID_VALIDATION_TEAM_ADMIN_EMAIL`
- `PAID_VALIDATION_TEAM_AGENT_EMAIL`

Optional environment values:

- `PAID_VALIDATION_INDIVIDUAL_ORG_NAME`
- `PAID_VALIDATION_INDIVIDUAL_ORG_SLUG`
- `PAID_VALIDATION_TEAM_ORG_NAME`
- `PAID_VALIDATION_TEAM_ORG_SLUG`
- `PAID_VALIDATION_PASSWORD`

Write guards:

- Set `PAID_VALIDATION_ENABLE_WRITE=1` to create or update the validation records.
- If `DATABASE_URL` points to Supabase or `NODE_ENV=production`, also set `ALLOW_PRODUCTION_PAID_VALIDATION_SETUP=true`.
- The script refuses to continue when either requested ZIP already has an active/trialing exclusive territory owned by another organization.
- The script does not run the broad seed file and does not delete leads, tasks, activities, organizations, users, memberships, or territories.

Use owner-controlled test emails. Do not use real customer data for validation.

## Validation Checklist

### Individual Organization

1. Confirm individual organization exists.
2. Confirm exactly one owner membership exists.
3. Confirm an active exclusive ZIP territory exists.
4. Submit or simulate a public lead with the individual ZIP.
5. Confirm lead routes to the individual organization.
6. Confirm `Lead.assignedAgentId` equals the owner user ID.
7. Confirm `LeadAssignmentHistory.reason = zip_match`.
8. Confirm assignment message says it was assigned to the individual account owner.
9. Confirm the owner can see the lead.
10. Confirm duplicate resubmission does not create a second lead.
11. Confirm duplicate activity is added to the existing lead.
12. Confirm no second new-lead notification is sent for the duplicate.

### Team Organization

1. Confirm team organization exists.
2. Confirm owner/admin/agent memberships exist.
3. Confirm an active exclusive ZIP territory exists.
4. Submit or simulate a public lead with the team ZIP.
5. Confirm lead routes to the team organization.
6. Confirm `Lead.assignedAgentId` is `null`.
7. Confirm `LeadAssignmentHistory.reason = zip_match`.
8. Confirm assignment message says the team lead was left unassigned for admin review.
9. Confirm team owner/admin can see the lead.
10. Confirm team agent visibility follows current organization-scoped rules.
11. Confirm duplicate resubmission does not create a second lead.
12. Confirm duplicate activity is added to the existing lead.
13. Confirm no second new-lead notification is sent for the duplicate.

### Permissions

1. Owner/admin can create a ZIP territory for their active organization.
2. Agent cannot create a ZIP territory.
3. Agent cannot update a ZIP territory.
4. Organization A cannot view Organization B leads.
5. Organization A cannot edit Organization B ZIP territories.
6. Manual Review remains scoped to the active organization.

### Territory Conflict Behavior

1. Active exclusive ZIP cannot be assigned to another active/trialing exclusive organization.
2. Duplicate active/trialing ZIP inside the same organization is blocked.
3. Expired/canceled ZIP rows do not block a future active territory under current app rules.
4. Multiple matching active territories should never silently pick a winner.

### Dashboard Visibility

1. Individual owner sees routed individual leads.
2. Team owner/admin sees routed team leads.
3. Team agent sees only currently permitted organization-scoped data.
4. Lead detail opens.
5. Notes can be added.
6. Follow-up tasks can be created.
7. Pipeline status can be moved.

## Suggested Non-Destructive API Validation

Use fake test data only. Prefer a non-production CRM URL first.

Buyer example:

```json
{
  "fullName": "Paid Individual Test",
  "email": "paid-individual-test@example.com",
  "phone": "337-555-7101",
  "lookingTo": "buy a home",
  "source": "Paid org validation",
  "zipCode": "<INDIVIDUAL_TEST_ZIP>",
  "desiredLocation": "Lafayette, LA",
  "timeframe": "Testing only",
  "message": "Controlled individual account routing validation."
}
```

Team example:

```json
{
  "fullName": "Paid Team Test",
  "email": "paid-team-test@example.com",
  "phone": "337-555-7201",
  "lookingTo": "sell a home",
  "source": "Paid org validation",
  "zipCode": "<TEAM_TEST_ZIP>",
  "desiredLocation": "Lafayette, LA",
  "timeframe": "Testing only",
  "message": "Controlled team account routing validation."
}
```

Do not submit these to production until the test organizations and territories are confirmed.

## Pass/Fail Criteria

Pass:

- Individual ZIP lead routes to the individual organization and assigns to the owner.
- Team ZIP lead routes to the team organization and remains unassigned.
- Owner/admin notification behavior is correct.
- Duplicate handling remains organization-scoped.
- Cross-organization data visibility remains blocked.
- Territory conflicts are blocked.
- No new Vercel/Supabase connection errors appear.

Fail:

- A lead routes to the wrong organization.
- A team lead auto-assigns to an agent unexpectedly.
- An individual lead does not assign to the clear owner.
- Agents can manage territories.
- One organization can see another organization's leads.
- Duplicate submission creates a second clear duplicate lead.
- New notification is sent for a clear duplicate.
- Paid org setup requires unsafe seed commands.

## Recommendation Before Paid Onboarding

Before selling paid ZIP territories, validate the platform-admin onboarding UI with one individual organization and one team organization. Keep the guarded script as a fallback for reviewed one-off setup only.

Also add a database-level partial unique index for active/trialing exclusive ZIP territories once the exclusivity rule is final.

Until then, paid org validation can proceed, but production setup should be considered operationally manual and higher risk.
