# Lead Notifications

This runbook covers CRM-native email notifications for public website leads.

## Overview

CRM-native email notifications send for new non-duplicate public leads after the `Lead` record is created. Email delivery is best-effort: lead creation still succeeds if the email provider is missing, unavailable, or returns an error.

Clear duplicate public submissions do not send a new-lead notification. Duplicate conflicts may notify because the CRM creates a new manual-review lead instead of silently merging two different existing leads.

The CRM currently uses Brevo transactional email through a small native `fetch` adapter. No SMS notification path exists yet.

## Environment Variables

Configure these in the hosting provider. Use placeholders only in local documentation and examples.

```env
BREVO_API_KEY="provider-api-key-placeholder"
CRM_EMAIL_FROM="crm@example.com"
CRM_EMAIL_FROM_NAME="Lafayette Real Estate CRM"
CRM_NOTIFICATION_FALLBACK_EMAIL="admin@example.com"
CRM_APP_URL="https://crm.example.com"
```

Notes:

- `BREVO_API_KEY` enables the Brevo transactional email API.
- `CRM_EMAIL_FROM` must be a sender address allowed by the email provider.
- `CRM_EMAIL_FROM_NAME` is the human-readable sender name.
- `CRM_NOTIFICATION_FALLBACK_EMAIL` is used only when no organization owner/admin recipient is found.
- `CRM_APP_URL` is used to include CRM lead-detail links in notification emails.

## Recipient Rules

- Individual organization with `assignedAgentId`: notify the assigned user.
- Individual organization without `assignedAgentId`: notify owner/admin members.
- Team organization: notify owner/admin members only.
- Internal/default fallback organization: notify owner/admin members, then `CRM_NOTIFICATION_FALLBACK_EMAIL` if no organization recipients exist.
- Recipient emails are deduplicated.
- Users without email addresses are ignored.

Team agents are not notified automatically yet, and team leads are not round-robin assigned.

## Live QA Checklist

1. Configure production email environment variables in the hosting provider.
2. Redeploy the CRM after environment variables are saved.
3. Confirm the sender email/domain is valid in Brevo.
4. Submit a new buyer lead from the live WordPress form with a unique email/phone.
5. Confirm the lead appears in the CRM.
6. Confirm the lead routes to the expected organization based on ZIP.
7. Confirm the CRM-side notification email is delivered.
8. Confirm the email contains lead details and a CRM link when `CRM_APP_URL` is configured.
9. Submit a new seller lead and confirm notification delivery.
10. Submit a lead routed to an individual organization and confirm the assigned owner/user receives it.
11. Submit a lead routed to a team organization and confirm owner/admin contacts receive it.
12. Submit a lead with a missing or unpurchased ZIP and confirm fallback/manual-review notification.
13. Submit the same lead again with the same email/phone.
14. Confirm duplicate handling prevents a second lead from being created.
15. Confirm the duplicate resubmission does not trigger another new-lead email.
16. Check production logs for safe, non-secret error messages only.

## Troubleshooting

Common causes when no CRM email arrives:

- `BREVO_API_KEY` is missing.
- `CRM_EMAIL_FROM` is missing.
- Sender email/domain is not verified or allowed in Brevo.
- `CRM_APP_URL` is missing, so the email has no CRM link.
- No owner/admin user email was found for the routed organization.
- `CRM_NOTIFICATION_FALLBACK_EMAIL` is not configured.
- The submission was a clear duplicate, so no new-lead notification was sent.
- Brevo returned an API error. The CRM logs a safe error and public lead intake still succeeds.

When troubleshooting, first confirm the lead was created in the CRM, then confirm whether the submission was new or duplicate, then inspect production logs for safe notification messages.

## Security Notes

- Never commit real API keys.
- Never paste production keys into Codex output, chat tools, issue trackers, or documentation.
- Never expose provider errors to public API responses.
- Use hosting provider environment variables for production secrets.
- Keep WordPress using server-side requests so CRM API keys are not exposed in browser JavaScript.

## WordPress Relationship

WordPress email notification may still exist. CRM-native notification is now preferred as the system of record because it follows CRM routing, dedupe, and organization ownership.

If both WordPress and CRM notifications are active, duplicate email alerts may occur for brand-new leads. Long term, decide whether the WordPress notification should be disabled after CRM-native notifications are fully verified in production.
