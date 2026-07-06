# Production Deployment Troubleshooting

This runbook covers the live production path for Lafayette Louisiana Real Estate CRM lead intake:

```text
WordPress form -> admin-ajax.php -> Vercel CRM API -> Supabase PostgreSQL
```

The public WordPress site is the lead capture surface. The Next.js app at `crm.lafayettelouisianarealestate.com` is the CRM backend and dashboard surface.

## Production URLS

CRM public lead endpoint:

```text
POST https://crm.lafayettelouisianarealestate.com/api/public/leads
```

Required headers:

```text
Content-Type: application/json
x-crm-api-key: <CRM_PUBLIC_API_KEY>
```

The API also accepts:

```text
Authorization: Bearer <CRM_PUBLIC_API_KEY>
```

WordPress should use `x-crm-api-key` from server-side PHP only. Do not expose the key in browser JavaScript.

## Vercel Deployment Checks

The custom domain must point to the latest intended production deployment.

Check the current production deployment:

```bash
npx vercel inspect https://crm.lafayettelouisianarealestate.com
```

If production behavior looks stale, confirm that the active deployment includes the latest code for:

- ZIP capture and normalization
- duplicate lead handling
- ZIP-to-organization routing
- `LeadAssignmentHistory` creation
- CRM-native lead notification

Redeploy only after local checks pass:

```bash
npm test
npm run lint
npm run build
npx vercel deploy --prod
```

## Database Connection

Vercel Production `DATABASE_URL` must use the Supabase pooler connection string. The direct Supabase database host may be unreachable from Vercel depending on project networking.

Do not print or paste the full `DATABASE_URL` into chats, docs, logs, or issue trackers.

Production Prisma migrations must be applied with:

```bash
npx prisma migrate deploy
```

Never run these against production:

```bash
npx prisma migrate dev
npx prisma migrate reset
```

Do not run production seed commands unless there is an explicit, reviewed reason. The seed script has a production safety guard, but production data should still be treated as live customer data.

## Required Environment Variables

Core production variables:

```text
DATABASE_URL
AUTH_SECRET
AUTH_URL
CRM_PUBLIC_API_KEY
CRM_ALLOWED_ORIGIN
CRM_APP_URL
```

Brevo CRM-native notification variables:

```text
BREVO_API_KEY
CRM_EMAIL_FROM
CRM_EMAIL_FROM_NAME
CRM_NOTIFICATION_FALLBACK_EMAIL
CRM_APP_URL
```

The WordPress snippet key and Vercel `CRM_PUBLIC_API_KEY` must match exactly.

## Common Failure Modes

`401 Unauthorized`

- API key is missing or mismatched.
- Confirm the WordPress snippet key matches Vercel `CRM_PUBLIC_API_KEY`.
- Confirm the key is sent in `x-crm-api-key` or `Authorization: Bearer ...`.

`403 Origin is not allowed`

- Origin/CORS mismatch.
- Confirm `CRM_ALLOWED_ORIGIN=https://lafayettelouisianarealestate.com`.
- Server-side WordPress PHP requests may omit `Origin`; that is supported.

`415 Content-Type must be application/json`

- The CRM API received a non-JSON request.
- WordPress PHP should send JSON to the CRM endpoint.

`429 Too many lead submissions`

- Public intake rate limiting was triggered.
- Wait for the rate-limit window to reset before retesting.

Blank `502` or `Something went wrong`

- Vercel function crash.
- stale Vercel deployment.
- unreachable database connection.
- missing production migration.
- WordPress PHP failing before or during the CRM request.

Lead saves with `zipCode = null`

- stale CRM deployment.
- WordPress payload does not include an accepted ZIP field.
- The live request is going through an older WordPress snippet path.

Accepted ZIP field names include:

```text
zipCode
zip_code
postalCode
postal_code
propertyZipCode
property_zip_code
desiredZipCode
desired_zip_code
```

`LeadAssignmentHistory` has 0 rows after a new public lead

- stale CRM deployment.
- routing code is not live.
- request is not hitting the current public intake handler.

`OrganizationZipCode` has 0 rows

- owned-territory routing cannot match yet.
- leads with ZIPs will fall back to manual review until active territories exist.

## Production Validation Checklist

1. Submit the WordPress homepage form.
2. Confirm the form returns the success message.
3. Confirm the Lead appears in the CRM dashboard.
4. Open the Lead detail page.
5. Confirm the Activity timeline exists.
6. Confirm `Lead.zipCode` displays as `ALLOCATION ZIP`.
7. Submit a lead with a purchased ZIP and confirm `LeadAssignmentHistory.reason = zip_match`.
8. Submit a lead with missing or unpurchased ZIP and confirm manual-review fallback.
9. Submit the same email/phone again and confirm no second Lead is created.
10. Confirm duplicate Activity is added to the existing Lead.
11. Confirm Brevo notification delivery for the first new non-duplicate lead.
12. Confirm duplicate resubmission does not send a second new-lead notification.

## Safe Logging

Production logs may include high-level operational events such as:

- request received
- validation failed
- lead created
- duplicate detected
- routing fallback
- notification sent or failed

Production logs must not include:

- API keys
- `DATABASE_URL`
- Supabase credentials
- Brevo keys
- raw request headers
- full request bodies
- lead email addresses or phone numbers

## Related Docs

- `docs/wordpress-lead-intake.md`
- `docs/membership-and-zip-code-allocation.md`
- `docs/lead-notifications.md`
