# WordPress Lead Intake

This document describes the live lead capture path from `www.lafayettelouisianarealestate.com` into the Lafayette Louisiana Real Estate CRM.

## Live Flow

The live homepage form does not send the CRM secret from the browser. It uses this server-side handoff:

1. Visitor submits the WordPress homepage form at `https://lafayettelouisianarealestate.com/#qualify`.
2. The browser posts `FormData` to WordPress `admin-ajax.php`.
3. The active WordPress Code Snippet validates name plus either email or phone.
4. WordPress sends a JSON request to the CRM public intake endpoint with the API key in a server-side header.
5. If the request includes an allocation ZIP code, the CRM normalizes and stores it on `Lead.zipCode`.
6. The CRM checks active/trialing exclusive ZIP territories.
7. The CRM creates the `Lead` in the matching organization, or the internal Lafayette organization when no ZIP/territory match is available.
8. The CRM creates a `lead_created` activity record and a `LeadAssignmentHistory` routing record.
9. The CRM sends a native new-lead email notification for new non-duplicate leads when email configuration is present.
10. The lead appears in that organization's `/dashboard/leads`, search results, lead detail, and pipeline.

## Operational Notes

The WordPress site is currently the public lead capture surface. Public visitors interact with WordPress forms, and WordPress is responsible for form validation, user-facing success/error messages, email delivery that still lives in WordPress, and server-side submission to the CRM.

The Next.js app is currently the CRM backend and admin surface. It owns the public intake API, database persistence, authentication, dashboard, lead detail, notes, tasks, pipeline stages, and activity timeline.

Keep this boundary until the project intentionally moves public lead capture into the Next.js app or introduces a shared form package.

## Live WordPress Snippets

Known active snippets:

- `Homepage Funnel Hero Photo Router - Magnolia Move`, snippet ID `8`
  - Owns the homepage lead form and `admin-ajax.php` handoff.
  - Posts server-side JSON to the CRM public intake endpoint.
  - Shows the success message: `Thanks. Your request was received and a local follow-up is being prepared.`
- `Lafayette CRM Lead Form Shortcode`, snippet ID `9`
  - Provides `[lafayette_lead_form]` for shortcode-based pages.
- `Lafayette CRM Demo Form Submitter`, snippet ID `10`
  - Handles the demo form path.

Keep any snippet source copied into project documentation when it changes. The live snippets are operational WordPress configuration, not currently deployed from this repository.

## CRM Endpoint

Production endpoint:

```text
POST https://crm.lafayettelouisianarealestate.com/api/public/leads
```

Required headers:

```text
Content-Type: application/json
x-crm-api-key: <CRM_PUBLIC_API_KEY>
```

The endpoint also accepts `Authorization: Bearer <CRM_PUBLIC_API_KEY>`, but WordPress should use `x-crm-api-key`.

Do not put the API key in the URL, query string, page HTML, or browser JavaScript.

## Required Payload Rules

CRM-level required field:

- `firstName`, `first_name`, `fullName`, `full_name`, or `name`

WordPress-level required fields:

- Name
- Email or phone

Email is optional at the CRM schema level, but if provided it must be a valid email address. The public WordPress form should continue requiring either email or phone so every lead has contact information.

`zipCode` is optional. If provided, it must be a valid five-digit ZIP code or ZIP+4. ZIP+4 values are normalized to the first five digits before storage.

## Supported JSON Payload

Example buyer payload:

```json
{
  "fullName": "Avery Thibodeaux",
  "email": "avery@example.com",
  "phone": "337-555-0202",
  "lookingTo": "Buy a home",
  "source": "Homepage buyer seller form",
  "formName": "Homepage property lead form",
  "pageUrl": "https://lafayettelouisianarealestate.com/",
  "desiredLocation": "Lafayette, LA",
  "desiredZipCode": "70508",
  "budgetMin": "300000",
  "budgetMax": "450000",
  "timeframe": "ASAP",
  "message": "Interested in homes near River Ranch."
}
```

Example seller payload:

```json
{
  "fullName": "Camille Broussard",
  "email": "camille@example.com",
  "phone": "337-555-0144",
  "lookingTo": "Request a home valuation",
  "source": "Homepage buyer seller form",
  "formName": "Homepage property lead form",
  "pageUrl": "https://lafayettelouisianarealestate.com/",
  "propertyInterest": "Home valuation",
  "propertyZipCode": "70503-1234",
  "timeframe": "1-3 months",
  "message": "Seller owns a home in Lafayette and wants pricing guidance."
}
```

## Field Mapping

| WordPress field | CRM API input | Prisma Lead field | Required | Notes |
|---|---|---|---|---|
| Name | `fullName` or `name` | `firstName`, `lastName` | Yes | Split into first and last name. Single names use `Website Lead` as last name. |
| First name | `firstName` or `first_name` | `firstName` | Yes if no full name | Direct mapping. |
| Last name | `lastName` or `last_name` | `lastName` | No | Defaults when missing. |
| Email | `email` | `email` | Email or phone required by WordPress | Must be valid if present. |
| Phone | `phone` | `phone` | Email or phone required by WordPress | Stored as text. |
| Lead type | `leadType` or `lead_type` | `leadType` | No | Enum: `buyer`, `seller`, `investor`, `renter`, `unknown`. |
| Looking to | `lookingTo` or `looking_to` | `propertyInterest`; inferred `leadType` | No | Infers buyer/seller/investor/renter when `leadType` is absent. |
| Source | `source` | `source` | No | Defaults to form name or `Website lead form`. |
| Form name | `formName` or `form_name` | `source` fallback | No | Also helps lead type inference. |
| Desired location | `desiredLocation` or `desired_location` | `desiredLocation` | No | Example: `Lafayette, LA`. |
| Allocation ZIP | `zipCode`, `zip_code`, `postalCode`, `postal_code`, `propertyZipCode`, `property_zip_code`, `desiredZipCode`, or `desired_zip_code` | `zipCode` | No | Stores normalized five-digit ZIP. ZIP+4 is accepted and shortened to five digits. Buyer forms should send desired/search ZIP. Seller forms should send property ZIP. |
| Budget minimum | `budgetMin` or `budget_min` | `budgetMin` | No | Numeric strings are accepted. |
| Budget maximum | `budgetMax` or `budget_max` | `budgetMax` | No | Numeric strings are accepted. |
| Freeform budget/value | `message` or `notes` | `notes` | No | Homepage freeform budget currently lands in notes. |
| Property address | `message`, `notes`, or `propertyInterest` | `notes` or `propertyInterest` | No | No dedicated property-address field yet. |
| Timeframe | `timeframe` | `timeframe` | No | Example: `ASAP`. |
| Message | `message` | `notes` | No | Combined with context notes. |
| Notes | `notes` | `notes` | No | Combined with message and tracking context. |
| Page URL | `pageUrl` or `page_url` | `notes` | No | Stored as a note line. |
| Referrer | `referrer` | `notes` | No | Stored as a note line. |
| UTM source | `utmSource` or `utm_source` | `notes` | No | Supported but not first-class in schema. |
| UTM medium | `utmMedium` or `utm_medium` | `notes` | No | Supported but not first-class in schema. |
| UTM campaign | `utmCampaign` or `utm_campaign` | `notes` | No | Supported but not first-class in schema. |
| Honeypot | `website` | none | No | If populated, CRM returns accepted spam response without normal lead creation. |

## Lead Defaults

Successful public submissions are created with:

| Field | Value |
|---|---|
| `organizationId` | Internal Lafayette organization (`org_internal_lafayette`) |
| `status` | `new_lead` |
| `leadType` | Explicit value or inferred from buyer/seller/investor/renter wording |
| `source` | Submitted source, form name, or `Website lead form` |
| `zipCode` | Submitted valid ZIP or `null` |
| `assignedAgentId` | `null` |
| `distributionStatus` | `unassigned` |
| Activity | `lead_created` |

## Security Requirements

The CRM public intake route enforces:

- `Content-Type: application/json`
- API key in `x-crm-api-key` or `Authorization: Bearer ...`
- No query-string API key support
- Allowed browser origin from `CRM_ALLOWED_ORIGIN`
- Server-to-server no-origin requests for WordPress PHP
- Payload size cap from `CRM_PUBLIC_LEAD_MAX_BODY_BYTES`
- Per-IP in-memory rate limit from `CRM_PUBLIC_LEAD_RATE_LIMIT_PER_MINUTE`

WordPress must keep using a server-side request to the CRM so the API key is never exposed to visitors.

ZIP code capture now controls basic organization routing for public leads. WordPress should send buyer desired/search ZIP or seller property ZIP whenever available. If WordPress does not send a ZIP, the lead is still created but falls back to the internal Lafayette organization for manual review.

Repeated submissions with the same email and/or phone inside the same routed organization are recorded as activity on the existing lead instead of creating unnecessary duplicate lead records. WordPress should continue sending email and phone whenever possible to improve duplicate matching quality.

CRM-side new-lead notification is now the preferred system of record for new non-duplicate public leads. WordPress email notification may still exist, but clear duplicate resubmissions do not send another CRM new-lead notification.

## Cache Flush

GoDaddy Managed WordPress can serve stale snippet output. After changing a WordPress snippet:

1. Save the snippet.
2. In the WordPress admin bar, use `Managed WordPress` -> `Flush Cache`.
3. Test with a cache-busting URL such as:

```text
https://lafayettelouisianarealestate.com/?qa=<timestamp>#qualify
```

If a fixed form still appears broken for one browser, test in a private window or add a fresh query string.

## Manual QA Script

Use unique test names/emails so CRM search is unambiguous.

1. Open `https://lafayettelouisianarealestate.com/?qa=<timestamp>#qualify`.
2. Submit a buyer lead with name, email or phone, buyer intent, timeframe, budget/value, and notes.
3. Confirm the form resets and shows: `Thanks. Your request was received and a local follow-up is being prepared.`
4. Open `https://crm.lafayettelouisianarealestate.com/dashboard/leads`.
5. Search by the test email or phone.
6. Confirm the lead appears with type `Buyer`, stage `New Lead`, and source `Homepage buyer seller form`.
7. Open the lead detail page.
8. Confirm notes include the submitted message and page URL.
9. Confirm the activity timeline includes the website submission event.
10. Create a follow-up task on the lead.
11. Confirm the task appears and the timeline includes `Task created`.
12. Add an internal note and confirm a note activity appears.
13. Move the lead to `Contacted` from the pipeline or lead status control.
14. Confirm a status-change activity appears.
15. Repeat with a seller or valuation lead and confirm it is distinguishable from buyer leads.
16. If the form exposes ZIP, submit a buyer desired ZIP and confirm the CRM stores the five-digit value.
17. If the form exposes seller property ZIP, submit ZIP+4 and confirm the CRM stores the first five digits.

Negative tests:

1. Submit without a name. Expect form validation and no CRM lead.
2. Submit with no email and no phone. Expect form validation and no CRM lead.
3. Submit an invalid email with no phone. Expect validation and no CRM lead.
4. Submit an invalid ZIP if the form/API client exposes one. Expect validation and no CRM lead.
5. Test missing API key with a safe API client against staging/local. Expect `401`.
6. Test invalid API key with a safe API client against staging/local. Expect `401`.
7. Test non-JSON CRM request against staging/local. Expect `415`.
8. Test rate limit against staging/local. Expect `429` after the configured threshold.

Avoid rate-limit and invalid-key testing against production unless needed; it can pollute logs or temporarily block legitimate testing from the same IP.

## Known Gaps

- WordPress snippets are not version-controlled in this repository.
- README and docs must be updated manually when snippets change.
- UTM fields are stored in `notes`, not first-class reporting fields.
- Page URL and referrer are stored in `notes`, not first-class reporting fields.
- Seller property address has no dedicated field.
- If WordPress does not collect ZIP, those leads fall back to the internal Lafayette organization for manual review.
- If WordPress does not collect email or phone, duplicate detection is limited and repeated submissions may create new leads.
- Duplicate lead handling has a first-pass implementation for same-organization email/phone matches; no merge/review UI exists yet.
- Rate limiting is in-memory and not durable across serverless instances.
- Payload limit depends on `Content-Length`.
- CRM native email notifications require provider environment variables before production delivery.
- Spam protection is limited to rate limiting plus a honeypot field.
- Dashboard client actions provide limited visible error feedback.
