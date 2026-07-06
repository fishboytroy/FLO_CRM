import { Lead, Organization, PipelineStage } from "@prisma/client";
import { labelFor, leadTypes } from "@/lib/crm";
import { NotificationRecipient } from "@/lib/lead-notification-recipients";
import { ReviewAssignmentRecord, reviewReasonLabel } from "@/lib/review-leads";

export type LeadNotificationLead = Pick<
  Lead,
  "id" | "firstName" | "lastName" | "email" | "phone" | "leadType" | "source" | "zipCode" | "timeframe" | "desiredLocation" | "propertyInterest" | "notes" | "status"
>;

export type LeadNotificationOrganization = Pick<Organization, "name">;

export type LeadNotificationPayload = {
  lead: LeadNotificationLead;
  organization: LeadNotificationOrganization;
  recipients: NotificationRecipient[];
  reviewAssignment?: ReviewAssignmentRecord | null;
};

export type EmailSendResult =
  | { ok: true; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

export type LeadEmailSender = (message: { to: NotificationRecipient[]; subject: string; text: string; html: string }) => Promise<EmailSendResult>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function crmLeadUrl(leadId: string) {
  const baseUrl = process.env.CRM_APP_URL ?? process.env.AUTH_URL;
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/dashboard/leads/${leadId}` : undefined;
}

export function buildLeadNotificationEmail({ lead, organization, recipients, reviewAssignment }: LeadNotificationPayload) {
  const leadType = labelFor(leadTypes, lead.leadType);
  const zip = lead.zipCode ?? "No ZIP";
  const leadName = `${lead.firstName} ${lead.lastName}`;
  const reviewLabel = reviewAssignment ? reviewReasonLabel(reviewAssignment) : undefined;
  const url = crmLeadUrl(lead.id);
  const lines = [
    `New Lafayette Real Estate Lead`,
    ``,
    `Organization: ${organization.name}`,
    `Lead: ${leadName}`,
    `Type: ${leadType}`,
    `Status: ${lead.status === PipelineStage.new_lead ? "New Lead" : lead.status}`,
    `Email: ${lead.email ?? "Not provided"}`,
    `Phone: ${lead.phone ?? "Not provided"}`,
    `ZIP: ${zip}`,
    `Source: ${lead.source ?? "Not provided"}`,
    `Timeframe: ${lead.timeframe ?? "Not provided"}`,
    `Location: ${lead.desiredLocation ?? "Not provided"}`,
    `Interest: ${lead.propertyInterest ?? "Not provided"}`,
    reviewLabel ? `Review: ${reviewLabel}` : undefined,
    reviewAssignment?.message ? `Review note: ${reviewAssignment.message}` : undefined,
    lead.notes ? `Notes:\n${lead.notes}` : undefined,
    url ? `Open in CRM: ${url}` : undefined
  ].filter((line): line is string => line !== undefined);

  const htmlRows = lines
    .filter((line) => line !== "")
    .map((line) => `<p>${escapeHtml(line).replaceAll("\n", "<br />")}</p>`)
    .join("");

  return {
    to: recipients,
    subject: `New Lafayette Real Estate Lead: ${leadType} ${zip}`,
    text: lines.join("\n"),
    html: `<div>${htmlRows}</div>`
  };
}

export async function brevoLeadEmailSender(message: { to: NotificationRecipient[]; subject: string; text: string; html: string }): Promise<EmailSendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.CRM_EMAIL_FROM;
  const fromName = process.env.CRM_EMAIL_FROM_NAME ?? "Lafayette Real Estate CRM";

  if (!message.to.length) return { ok: true, skipped: true, reason: "No notification recipients configured" };
  if (!apiKey || !fromEmail) return { ok: true, skipped: true, reason: "Email provider is not configured" };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: message.to.map((recipient) => ({ email: recipient.email, name: recipient.name ?? undefined })),
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html
      })
    });

    if (!response.ok) return { ok: false, error: `Email provider returned ${response.status}` };
    return { ok: true };
  } catch {
    return { ok: false, error: "Email provider request failed" };
  }
}

export async function sendLeadNotification(payload: LeadNotificationPayload, sender: LeadEmailSender = brevoLeadEmailSender) {
  if (!payload.recipients.length) return { ok: true, skipped: true, reason: "No notification recipients configured" } satisfies EmailSendResult;
  const message = buildLeadNotificationEmail(payload);
  return sender(message);
}
