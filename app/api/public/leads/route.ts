import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INTERNAL_ORG_ID } from "@/lib/access";
import { duplicateMatchLabel, findDuplicateLeadDecision } from "@/lib/duplicate-leads";
import { sendLeadNotification } from "@/lib/email/lead-notifications";
import { getLeadNotificationRecipients } from "@/lib/lead-notification-recipients";
import { checkRateLimit } from "@/lib/rate-limit";
import { isReviewAssignment } from "@/lib/review-leads";
import { getLeadRoutingDecision } from "@/lib/territory-zip-codes";
import {
  corsHeaders,
  getClientIp,
  getHeaderApiKey,
  isAllowedOrigin,
  duplicateLeadActivityMessage,
  duplicateLeadUpdateData,
  normalizePublicLead,
  PUBLIC_LEAD_RATE_LIMIT_WINDOW_MS,
  publicLeadMaxBodyBytes,
  publicLeadRateLimit,
  verifyApiKey
} from "@/lib/public-lead-intake";

export function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  if (!isAllowedOrigin(origin)) return new NextResponse(null, { status: 403, headers });
  return new NextResponse(null, { status: 204, headers });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/public/leads",
    method: "POST",
    requiredHeaders: ["x-crm-api-key"]
  });
}

type SafePublicLeadLogMeta = Record<string, boolean | number | string | null | undefined>;

function publicLeadLog(event: string, meta: SafePublicLeadLogMeta = {}) {
  console.info("Public lead intake", { event, ...meta });
}

function publicLeadError(event: string, error: unknown, meta: SafePublicLeadLogMeta = {}) {
  console.error("Public lead intake", {
    event,
    ...meta,
    errorName: error instanceof Error ? error.name : "UnknownError"
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  let operation = "start";
  publicLeadLog("request_received", { hasOrigin: Boolean(origin) });

  if (!isAllowedOrigin(origin)) {
    publicLeadLog("origin_rejected", { hasOrigin: Boolean(origin) });
    return NextResponse.json({ error: "Origin is not allowed" }, { status: 403, headers });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > publicLeadMaxBodyBytes()) {
    publicLeadLog("payload_too_large", { contentLength });
    return NextResponse.json({ error: "Payload is too large" }, { status: 413, headers });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    publicLeadLog("content_type_rejected");
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415, headers });
  }

  const clientIp = getClientIp(request.headers);
  const rateLimit = checkRateLimit(`public-lead:${clientIp}`, publicLeadRateLimit(), PUBLIC_LEAD_RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    publicLeadLog("rate_limited");
    return NextResponse.json(
      { error: "Too many lead submissions. Please try again shortly." },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(Math.max(Math.ceil((rateLimit.resetAt - Date.now()) / 1000), 1))
        }
      }
    );
  }

  const configuredApiKey = process.env.CRM_PUBLIC_API_KEY;
  if (!configuredApiKey) {
    publicLeadLog("configuration_missing");
    return NextResponse.json({ error: "Lead intake is not configured" }, { status: 500, headers });
  }

  if (!verifyApiKey(getHeaderApiKey(request.headers), configuredApiKey)) {
    publicLeadLog("unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  const body = await request.json().catch(() => null);
  const normalized = normalizePublicLead(body);
  if (!normalized.success) {
    publicLeadLog("validation_failed");
    return NextResponse.json({ error: normalized.error }, { status: 400, headers });
  }
  if (normalized.data.spam) {
    publicLeadLog("spam_accepted");
    return NextResponse.json({ ok: true, spam: true }, { status: 202, headers });
  }
  try {
    const data = normalized.data;
    operation = "routing";
    const routingDecision = await getLeadRoutingDecision(prisma, data.zipCode, INTERNAL_ORG_ID);
    const organizationId = routingDecision.organizationId;
    if (isReviewAssignment(routingDecision)) {
      publicLeadLog("routing_fallback", {
        organizationId,
        routingReason: routingDecision.reason,
        hasZip: Boolean(data.zipCode)
      });
    }

    const duplicateSelect = {
      id: true,
      email: true,
      phone: true,
      source: true,
      budgetMin: true,
      budgetMax: true,
      desiredLocation: true,
      zipCode: true,
      propertyInterest: true,
      timeframe: true,
      notes: true
    };
    operation = "duplicate_lookup";
    const duplicateDecision = await findDuplicateLeadDecision(prisma, organizationId, data.email, data.phone);
    operation = "existing_lead_lookup";
    const existingLead = duplicateDecision.matchedLeadId
      ? await prisma.lead.findFirst({
          where: { id: duplicateDecision.matchedLeadId, organizationId },
          select: duplicateSelect
        })
      : null;

    if (existingLead) {
      const updateData = duplicateLeadUpdateData(existingLead, data);
      operation = "duplicate_update";
      await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          ...updateData,
          activities: {
            create: {
              organizationId,
              type: "lead_updated",
              message: duplicateLeadActivityMessage(data, duplicateMatchLabel(duplicateDecision))
            }
          }
        }
      });
      publicLeadLog("duplicate_detected", {
        leadId: existingLead.id,
        organizationId,
        matchedBy: duplicateMatchLabel(duplicateDecision),
        hasZip: Boolean(data.zipCode)
      });

      return NextResponse.json({ ok: true, leadId: existingLead.id, duplicate: true }, { status: 200, headers });
    }

    operation = "lead_create";
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        leadType: data.leadType,
        status: "new_lead",
        source: data.source,
        assignedAgentId: routingDecision.assignedAgentId,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        desiredLocation: data.desiredLocation,
        zipCode: data.zipCode,
        propertyInterest: data.propertyInterest,
        timeframe: data.timeframe,
        notes: data.notes,
        activities: {
          create:
            duplicateDecision.kind === "duplicate_conflict"
              ? [
                  {
                    organizationId,
                    type: "lead_created",
                    message: data.activityMessage
                  },
                  {
                    organizationId,
                    type: "note",
                    message: `Potential duplicate conflict: email matched lead ${duplicateDecision.emailLeadId}, but phone matched lead ${duplicateDecision.phoneLeadId}. Manual review required.`
                  }
                ]
              : {
                  organizationId,
                  type: "lead_created",
                  message: data.activityMessage
                }
        },
        assignmentHistory: {
          create: {
            toOrganizationId: routingDecision.organizationId,
            toUserId: routingDecision.assignedAgentId,
            zipCode: routingDecision.zipCode,
            reason: routingDecision.reason,
            message: routingDecision.message
          }
        }
      },
      include: {
        organization: true,
        assignmentHistory: { orderBy: { createdAt: "desc" } }
      }
    });
    publicLeadLog("lead_created", {
      leadId: lead.id,
      organizationId: lead.organizationId,
      routingReason: routingDecision.reason,
      hasZip: Boolean(data.zipCode)
    });

    operation = "notification_recipients";
    const recipients = await getLeadNotificationRecipients(prisma, lead.organizationId, lead.assignedAgentId);
    operation = "notification_send";
    const notificationResult = await sendLeadNotification({
      lead,
      organization: lead.organization,
      recipients,
      reviewAssignment: lead.assignmentHistory.find(isReviewAssignment)
    });
    if (!notificationResult.ok) {
      publicLeadError("notification_failed", notificationResult.error, { leadId: lead.id, organizationId: lead.organizationId });
    } else {
      publicLeadLog("notification_sent", { leadId: lead.id, organizationId: lead.organizationId, recipientCount: recipients.length });
    }

    return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201, headers });
  } catch (error) {
    publicLeadError("failed", error, { operation });
    return NextResponse.json({ error: "Lead intake failed", code: operation }, { status: 500, headers });
  }
}
