import crypto from "crypto";
import { LeadType } from "@prisma/client";
import { labelFor, leadTypes } from "@/lib/crm";
import { publicLeadSchema } from "@/lib/validation";

export const DEFAULT_ALLOWED_ORIGIN = "https://lafayettelouisianarealestate.com";
export const DEFAULT_PUBLIC_LEAD_RATE_LIMIT = 12;
export const PUBLIC_LEAD_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_PUBLIC_LEAD_MAX_BODY_BYTES = 32_768;

export function getAllowedOrigin() {
  return process.env.CRM_ALLOWED_ORIGIN ?? DEFAULT_ALLOWED_ORIGIN;
}

export function isAllowedOrigin(origin: string | null, allowedOrigin = getAllowedOrigin()) {
  return !origin || origin === allowedOrigin;
}

export function corsHeaders(origin: string | null, allowedOrigin = getAllowedOrigin()) {
  return {
    ...(origin && origin === allowedOrigin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-crm-api-key",
    "Vary": "Origin"
  };
}

export function getHeaderApiKey(headers: Headers) {
  const bearer = headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return headers.get("x-crm-api-key") ?? bearer;
}

export function verifyApiKey(provided: string | null | undefined, configured: string | undefined) {
  if (!provided || !configured) return false;
  const providedBuffer = Buffer.from(provided);
  const configuredBuffer = Buffer.from(configured);
  if (providedBuffer.length !== configuredBuffer.length) return false;
  return crypto.timingSafeEqual(providedBuffer, configuredBuffer);
}

export function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || headers.get("x-real-ip") || "unknown";
}

export function publicLeadRateLimit() {
  const parsed = Number(process.env.CRM_PUBLIC_LEAD_RATE_LIMIT_PER_MINUTE);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PUBLIC_LEAD_RATE_LIMIT;
}

export function publicLeadMaxBodyBytes() {
  const parsed = Number(process.env.CRM_PUBLIC_LEAD_MAX_BODY_BYTES);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PUBLIC_LEAD_MAX_BODY_BYTES;
}

export function splitName(fullName?: string) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!parts.length) return { firstName: undefined, lastName: undefined };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Website Lead" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function inferLeadType(raw?: string): LeadType {
  const value = raw?.toLowerCase() ?? "";
  if (value.includes("buy")) return "buyer";
  if (value.includes("sell") || value.includes("valuation")) return "seller";
  if (value.includes("invest")) return "investor";
  if (value.includes("rent")) return "renter";
  return "unknown";
}

export function normalizePublicLead(body: unknown) {
  const parsed = publicLeadSchema.safeParse(body);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };

  const data = parsed.data;
  const split = splitName(data.fullName ?? data.full_name ?? data.name);
  const firstName = data.firstName ?? data.first_name ?? split.firstName;
  const lastName = data.lastName ?? data.last_name ?? split.lastName ?? "Website Lead";

  if (!firstName) {
    return { success: false as const, error: "First name or full name is required" };
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

  return {
    success: true as const,
    data: {
      firstName,
      lastName,
      email: data.email,
      phone: data.phone,
      leadType,
      source,
      budgetMin: data.budgetMin ?? data.budget_min,
      budgetMax: data.budgetMax ?? data.budget_max,
      desiredLocation: data.desiredLocation ?? data.desired_location,
      propertyInterest: data.propertyInterest ?? data.property_interest ?? data.lookingTo ?? data.looking_to,
      timeframe: data.timeframe,
      notes: contextNotes.length ? contextNotes.join("\n") : undefined,
      activityMessage: `Website ${labelFor(leadTypes, leadType)} lead submitted from ${source}.`,
      spam: Boolean(data.website)
    }
  };
}
