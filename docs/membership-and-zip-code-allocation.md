# Membership and Zip Code Allocation Plan

This document captures the membership and zip-code lead allocation direction for the Lafayette Louisiana Real Estate CRM.

The Phase 1.5 schema foundation is now represented in Prisma, but the application does not route live leads by zip code yet. Treat this as a foundation for the next implementation phase, not as completed allocation behavior.

## Product Goal

The CRM should become reliable enough for real inbound leads before advanced automation is added. The public website should continue capturing leads, while the CRM should route those leads to the correct paid account based on purchased zip codes.

Membership types:

1. Single User Membership
2. Team Membership with an admin and users

Both membership types are represented by an `Organization`, because the existing multi-tenant foundation already uses organizations as the account container for users, leads, tasks, and activities.

## Current State

Today, website leads from `lafayettelouisianarealestate.com` land in the internal Lafayette organization first. The CRM can display the lead, show lead detail, create notes, create tasks, and move the lead through pipeline stages.

The schema now includes first-class zip-code allocation foundation:

- `Organization.plan` already supports `internal`, `individual`, and `team`.
- `Membership.role` supports organization-level owner/admin/agent roles.
- `Lead.zipCode` exists for future lead allocation and filtering.
- `OrganizationZipCode` exists to record purchased or controlled zip codes.
- `LeadAssignmentHistory` exists to audit organization/user allocation and reassignment decisions.
- Public intake accepts common ZIP field names and stores normalized five-digit values on `Lead.zipCode`.
- `Lead.zipCode` is visible in CRM lead overview/detail views and can be entered on the internal lead form.
- Organization owners/admins can manage `OrganizationZipCode` territory records from `/dashboard/settings/territories`.
- Public leads with a matching active/trialing exclusive territory now route to that territory's organization.
- `LeadAssignmentHistory` records public lead routing decisions.
- Manual review leads are visible at `/dashboard/leads/review`.
- Duplicate public lead submissions are checked after ZIP routing determines organization ownership.
- New non-duplicate public leads send native CRM email notifications when email provider settings are configured.

Current distribution fields such as `distributionStatus`, `claimedAt`, `exclusiveUntil`, `leadPriceCents`, and `marketArea` remain placeholders for future allocation and membership workflows.

## Account Model Direction

### Single User Membership

A single user membership is an `Organization` with `plan = individual` and one primary owner. The owner buys one or more zip codes and receives leads for those zip codes.

Expected behavior:

- Organization plan uses the existing `Organization.plan` field.
- Organization has one owner membership.
- Leads allocated to the organization should default to the owner as the assigned user.
- The owner can manage their own leads, notes, tasks, and pipeline.
- If the owner upgrades to a team, the organization should remain the same account container when possible.

### Team Membership

A team membership is an `Organization` with `plan = team`, an admin or owner, and multiple users. The team buys one or more zip codes and receives leads for those zip codes.

Expected behavior:

- Organization plan uses the existing `Organization.plan` field.
- Organization has at least one admin or owner membership.
- Organization can have multiple users/agents.
- Leads allocated to the organization should initially be visible to the team admin.
- Admin can manually assign leads to team users first.
- Automated routing can be added later after assignment rules are defined.

## Purchased Zip Codes

Purchased zip codes are the future lead allocation mechanism.

Core idea:

- A membership account buys one or more zip codes.
- A lead arrives with, or is enriched with, a zip code.
- The CRM finds which organization owns or is eligible for that zip code.
- The CRM assigns the lead to that organization.
- Assignment to an individual user depends on account type and routing rules.

Zip-code allocation should remain organization-scoped. A lead should not be assigned globally by user email or role without first deciding the owning organization.

For Phase 1.5, zip codes should be treated as exclusive per active organization at the application layer. Do not add a broad database uniqueness constraint yet, because expired and canceled rows must remain historically visible. Before paid sales go live, add a Postgres partial unique index for active exclusive zip codes after the exact status rules are finalized.

## Current Public Lead Routing

Basic ZIP-to-organization routing is active for public leads.

Routing rules:

- Active/trialing exclusive `OrganizationZipCode` records control routing.
- If exactly one active/trialing exclusive territory matches `Lead.zipCode`, the lead is created under that territory's organization.
- If the matched organization has `plan = individual` and exactly one owner membership, the lead is assigned to that owner through `assignedAgentId`.
- If the matched organization has `plan = team`, the lead is created at the organization level and left unassigned for team admin review.
- Missing ZIP, unpurchased ZIP, expired/canceled-only ZIP, and conflicting multiple matches fall back to the internal/default Lafayette organization for manual review.
- Every new public lead receives a `LeadAssignmentHistory` record describing the routing decision.
- The manual review page shows fallback/unmatched leads and owner-assignment review cases for the current organization.

This routing is not billing. It does not enforce subscriptions, charge for leads, or perform team round-robin assignment.

## Duplicate Lead Handling

Duplicate handling runs after ZIP routing determines the owning organization.

Rules:

- Duplicate checks are scoped to the routed organization only.
- Matching uses email and/or phone.
- Email matching is case-insensitive and trimmed.
- Phone matching normalizes common formatting to digits for comparison.
- Name-only and ZIP-only matching are intentionally not used.
- Cross-organization dedupe is intentionally not performed.
- When a clear duplicate is found, the CRM does not create a new lead.
- Duplicate public submissions create a `lead_updated` activity on the existing lead with submission context.
- If email matches one existing lead and phone matches a different existing lead, the CRM does not merge automatically. It creates a new lead and adds a conflict activity for manual review.

This prevents repeated form submissions from filling an organization's CRM with unnecessary duplicate leads while preserving useful submission history.

## Native CRM Email Notifications

Native CRM email notifications are sent for new non-duplicate public leads.

Rules:

- Notifications follow routed organization ownership.
- Individual account leads notify the assigned user when `assignedAgentId` is present.
- If an individual lead is not assigned, owner/admin members of the organization are notified.
- Team account leads notify owner/admin members first.
- Manual review/fallback leads notify owner/admin contacts for the internal/default organization.
- If no organization recipients are found, `CRM_NOTIFICATION_FALLBACK_EMAIL` can be used.
- Clear duplicate public submissions do not send new-lead notifications.
- Email delivery is best-effort; lead creation succeeds even if email delivery fails.

Future work:

- Production email provider verification.
- Team agent notification rules.
- SMS notifications after email notification and duplicate handling are stable.

## Manual Review Workflow

Manual review exists for leads that cannot be confidently completed by ZIP routing.

Route:

- `/dashboard/leads/review`

Review leads are identified from existing `LeadAssignmentHistory` records:

- `reason = unpurchased_zip`
- `reason = admin_override`
- `zip_match` history whose message indicates no clear individual owner was found

The review page shows lead name, contact information, lead type, ZIP, source, created date, review reason, current organization, assigned agent, and a link to the lead detail page.

From the lead detail page, users can use existing CRM workflows to add notes, create follow-up tasks, and move pipeline stage. A full cross-organization reassignment workflow is not implemented yet.

Authorization remains organization-scoped:

- Internal/default Lafayette organization users see fallback leads owned by that organization.
- Regular organizations see only review leads owned by their organization.
- One organization cannot see another organization's review leads.
- Team leads are still not auto-assigned to agents.

Billing and subscriptions remain out of scope.

## Lead Allocation Flow

1. Lead enters CRM from WordPress/public intake.
2. CRM determines the lead zip code.
   - Directly from a submitted `zipCode` field, or
   - Inferred from property address, desired location, or later enrichment.
3. CRM checks active/trialing exclusive `OrganizationZipCode` records.
4. CRM creates the lead under the matched organization, or the internal/default Lafayette organization when review is needed.
5. If the organization is a single-user account with one clear owner, assign the lead to the owner.
6. If the organization is a team account, leave the lead available for admin assignment first.
7. Record allocation decisions in `LeadAssignmentHistory`.
8. Later, add automated team routing after business rules are finalized.

## Implemented Schema Foundation

### Organization.plan

The existing `Organization.plan` enum is the plan-type field for now.

Current values:

- `internal`
- `individual`
- `team`

Do not add `Organization.planType` unless billing/product needs prove the existing field is insufficient.

### OrganizationZipCode

Purpose: records which organization purchased or controls a zip code.

Management:

- Route: `/dashboard/settings/territories`
- API: `GET /api/organization-zip-codes`
- API: `POST /api/organization-zip-codes`
- API: `PATCH /api/organization-zip-codes/[id]`

Owner/admin users can view and manage territories for their current organization. Platform admins can manage the active organization context. Agent users cannot create or update territory records.

Territory management is not billing and does not route leads yet. It is internal setup for future purchased territory ownership.

Implemented fields:

- `id`
- `organizationId`
- `zipCode`
- `status`: `active`, `trialing`, `expired`, `canceled`
- `exclusive`
- `startsAt`
- `expiresAt`
- `createdAt`
- `updatedAt`

Implemented indexes:

- `organizationId`
- `zipCode`
- `status`

Application-level exclusivity:

- Active/trialing exclusive ZIP records cannot overlap across organizations.
- Active/trialing duplicates are blocked within the same organization.
- Expired/canceled records do not block a future active territory.
- A database-level Postgres partial unique index is still recommended before paid ZIP sales go live.

### Lead.zipCode

Purpose: store the lead's allocation zip code as a first-class field.

Implemented indexes:

- `zipCode`
- `organizationId, zipCode`

Future behavior:

- Continue accepting `zipCode` and common aliases from public intake when available.
- Store a normalized five-digit zip code.
- Use for lead list filters and future reporting.
- Do not rely only on freeform `desiredLocation` for allocation.
- Admin/agent users should verify ZIP accuracy before relying on future routing decisions.

Accepted public intake aliases:

- `zipCode`
- `zip_code`
- `postalCode`
- `postal_code`
- `propertyZipCode`
- `property_zip_code`
- `desiredZipCode`
- `desired_zip_code`

Buyer leads should use desired/search ZIP when available. Seller leads should use property ZIP when available. For mixed or unknown leads, treat the submitted ZIP as the allocation ZIP.

### Lead.assignedAgentId

The schema keeps the existing `assignedAgentId` field. This remains the assigned CRM user field for now.

Recommendation:

- Avoid renaming `assignedAgentId` during the allocation foundation work.
- Revisit naming only if membership language expands beyond agents enough to justify a planned migration.

### LeadAssignmentHistory

Purpose: records how and why a lead moved between organizations/users.

Implemented fields:

- `id`
- `leadId`
- `fromOrganizationId`
- `toOrganizationId`
- `fromUserId`
- `toUserId`
- `zipCode`
- `reason`: `zip_match`, `manual_assignment`, `reassignment`, `expired_zip`, `admin_override`, `unpurchased_zip`
- `message`
- `createdByUserId`
- `createdAt`

Implemented indexes:

- `leadId`
- `zipCode`
- `toOrganizationId`
- `toUserId`
- `createdAt`

Use this for auditability before adding automated routing.

## Open Business Questions

- Are zip codes always exclusive, or can that change later?
- Can multiple organizations buy the same zip code in any future shared model?
- If shared later, how are leads distributed: round-robin, priority, auction, rotation, or manual review?
- What happens to leads from unpurchased zip codes?
- Do unpurchased zip leads stay with the internal Lafayette organization?
- Can single users upgrade to teams without losing leads/history?
- What happens when a zip code subscription expires?
- Should expired accounts keep historical leads but stop receiving new leads?
- Should leads be assigned manually first or automatically routed?
- Should team admins see all team leads by default?
- Can team users see only their assigned leads?
- Should purchased zip codes be tied to billing subscriptions, manual admin setup, or both?
- Should there be a grace period for failed payment before zip-code access expires?

## Recommended Implementation Order

Recommended order after the schema foundation:

1. Confirm the live WordPress form sends buyer desired ZIP or seller property ZIP when the field is available.
2. Confirm production email provider configuration and live delivery.
3. Add team admin/manual user assignment flow.
4. Add first-class attribution fields for UTM/page/referrer.
5. Improve mobile dashboard UX.
6. Add durable production rate limiting.
7. Add database-level partial unique index before paid ZIP sales go live.

## Current Gaps

- WordPress snippet code is not versioned in this repository.
- Native CRM notification delivery still needs production provider verification.
- UTM/page/referrer are stored in notes, not first-class fields.
- Duplicate handling has a first-pass implementation for same-organization email/phone matches; no merge/review UI exists yet.
- Rate limiting is in-memory and not distributed.
- Payload size protection depends partly on `Content-Length`.
- Full cross-organization reassignment workflow is not implemented yet.
- WordPress may not yet send ZIP from every live form.
- Zip-code exclusivity is enforced at the app layer first; no partial unique index exists yet.
- Billing/subscription behavior for zip codes is not finalized.
- Team assignment flow is not implemented yet.

## Non-Goals For Current Phase

- Do not add billing enforcement yet.
- Do not add automated routing yet.
- Do not add round-robin assignment yet.
- Do not rename `assignedAgentId` yet.
- Do not expose CRM secrets to WordPress page HTML or browser JavaScript.
