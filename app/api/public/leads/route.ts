import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INTERNAL_ORG_ID } from "@/lib/access";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  corsHeaders,
  getClientIp,
  getHeaderApiKey,
  isAllowedOrigin,
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

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: "Origin is not allowed" }, { status: 403, headers });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > publicLeadMaxBodyBytes()) {
    return NextResponse.json({ error: "Payload is too large" }, { status: 413, headers });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415, headers });
  }

  const clientIp = getClientIp(request.headers);
  const rateLimit = checkRateLimit(`public-lead:${clientIp}`, publicLeadRateLimit(), PUBLIC_LEAD_RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
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
    return NextResponse.json({ error: "Lead intake is not configured" }, { status: 500, headers });
  }

  if (!verifyApiKey(getHeaderApiKey(request.headers), configuredApiKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  const body = await request.json().catch(() => null);
  const normalized = normalizePublicLead(body);
  if (!normalized.success) {
    return NextResponse.json({ error: normalized.error }, { status: 400, headers });
  }
  if (normalized.data.spam) {
    return NextResponse.json({ ok: true, spam: true }, { status: 202, headers });
  }
  const data = normalized.data;

  const lead = await prisma.lead.create({
    data: {
      organizationId: INTERNAL_ORG_ID,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      leadType: data.leadType,
      status: "new_lead",
      source: data.source,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      desiredLocation: data.desiredLocation,
      propertyInterest: data.propertyInterest,
      timeframe: data.timeframe,
      notes: data.notes,
      activities: {
        create: {
          organizationId: INTERNAL_ORG_ID,
          type: "lead_created",
          message: data.activityMessage
        }
      }
    }
  });

  return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201, headers });
}
