import { NextRequest, NextResponse } from "next/server";
import { LeadType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publicLeadSchema } from "@/lib/validation";
import { labelFor, leadTypes } from "@/lib/crm";
import { INTERNAL_ORG_ID } from "@/lib/access";

const allowedOrigin = process.env.CRM_ALLOWED_ORIGIN ?? "https://lafayettelouisianarealestate.com";

function corsHeaders(origin: string | null) {
  const allowOrigin = origin === allowedOrigin ? origin : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-crm-api-key",
    "Vary": "Origin"
  };
}

function getApiKey(request: NextRequest, bodyApiKey?: unknown) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return request.headers.get("x-crm-api-key") ?? bearer ?? (typeof bodyApiKey === "string" ? bodyApiKey : undefined);
}

function splitName(fullName?: string) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!parts.length) return { firstName: undefined, lastName: undefined };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Website Lead" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function inferLeadType(raw?: string): LeadType {
  const value = raw?.toLowerCase() ?? "";
  if (value.includes("buy")) return "buyer";
  if (value.includes("sell") || value.includes("valuation")) return "seller";
  if (value.includes("invest")) return "investor";
  if (value.includes("rent")) return "renter";
  return "unknown";
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
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
  const body = await request.json().catch(() => null);

  const configuredApiKey = process.env.CRM_PUBLIC_API_KEY;
  if (!configuredApiKey) {
    return NextResponse.json({ error: "Lead intake is not configured" }, { status: 500, headers });
  }

  if (!body || getApiKey(request, body.apiKey) !== configuredApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  const parsed = publicLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400, headers });
  }

  const data = parsed.data;
  if (data.website) {
    return NextResponse.json({ ok: true, spam: true }, { status: 202, headers });
  }

  const split = splitName(data.fullName ?? data.full_name ?? data.name);
  const firstName = data.firstName ?? data.first_name ?? split.firstName;
  const lastName = data.lastName ?? data.last_name ?? split.lastName;

  if (!firstName) {
    return NextResponse.json({ error: "First name or full name is required" }, { status: 400, headers });
  }

  const leadType = data.leadType ?? data.lead_type ?? inferLeadType(data.lookingTo ?? data.looking_to ?? data.formName ?? data.form_name);
  const source = data.source ?? data.formName ?? data.form_name ?? "Website lead form";
  const pageUrl = data.pageUrl ?? data.page_url;
  const utmSource = data.utmSource ?? data.utm_source;
  const utmMedium = data.utmMedium ?? data.utm_medium;
  const utmCampaign = data.utmCampaign ?? data.utm_campaign;

  const contextNotes = [
    data.notes,
    data.message,
    pageUrl ? `Page URL: ${pageUrl}` : undefined,
    data.referrer ? `Referrer: ${data.referrer}` : undefined,
    utmSource ? `UTM source: ${utmSource}` : undefined,
    utmMedium ? `UTM medium: ${utmMedium}` : undefined,
    utmCampaign ? `UTM campaign: ${utmCampaign}` : undefined
  ].filter(Boolean);

  const lead = await prisma.lead.create({
    data: {
      organizationId: INTERNAL_ORG_ID,
      firstName,
      lastName: lastName ?? "Website Lead",
      email: data.email,
      phone: data.phone,
      leadType,
      status: "new_lead",
      source,
      budgetMin: data.budgetMin ?? data.budget_min,
      budgetMax: data.budgetMax ?? data.budget_max,
      desiredLocation: data.desiredLocation ?? data.desired_location,
      propertyInterest: data.propertyInterest ?? data.property_interest ?? data.lookingTo ?? data.looking_to,
      timeframe: data.timeframe,
      notes: contextNotes.length ? contextNotes.join("\n") : undefined,
      activities: {
        create: {
          organizationId: INTERNAL_ORG_ID,
          type: "lead_created",
          message: `Website ${labelFor(leadTypes, leadType)} lead submitted from ${source}.`
        }
      }
    }
  });

  return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201, headers });
}
