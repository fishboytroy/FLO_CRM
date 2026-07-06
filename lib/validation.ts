import { LeadType, PipelineStage, TaskStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = z.string().trim().optional().transform((value) => (value ? value : undefined));
const optionalZipText = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") return undefined;
    return String(value).trim() || undefined;
  });
const optionalZipCode = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === "") return undefined;
    const trimmed = String(value).trim();
    if (!trimmed) return undefined;
    const match = trimmed.match(/^(\d{5})(?:-\d{4})?$/);
    if (!match) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Use a valid 5-digit ZIP or ZIP+4" });
      return z.NEVER;
    }
    return match[1];
  });
const optionalInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") return undefined;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  });

export const leadSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Use a valid email").optional().or(z.literal("")).transform((v) => v || undefined),
  phone: optionalText,
  leadType: z.nativeEnum(LeadType),
  status: z.nativeEnum(PipelineStage),
  source: optionalText,
  assignedAgentId: optionalText,
  budgetMin: optionalInt,
  budgetMax: optionalInt,
  desiredLocation: optionalText,
  zipCode: optionalZipCode,
  propertyInterest: optionalText,
  timeframe: optionalText,
  notes: optionalText
});

export const taskSchema = z.object({
  leadId: z.string().min(1),
  assignedUserId: optionalText,
  title: z.string().trim().min(1, "Task title is required"),
  description: optionalText,
  dueDate: z.string().min(1, "Due date is required"),
  status: z.nativeEnum(TaskStatus).default("pending")
});

export const noteSchema = z.object({
  message: z.string().trim().min(1, "Note cannot be empty")
});

export const pipelineMoveSchema = z.object({
  status: z.nativeEnum(PipelineStage)
});

export const publicLeadSchema = z
  .object({
    firstName: optionalText,
    first_name: optionalText,
    lastName: optionalText,
    last_name: optionalText,
    name: optionalText,
    fullName: optionalText,
    full_name: optionalText,
    email: z.string().trim().email("Use a valid email").optional().or(z.literal("")).transform((v) => v || undefined),
    phone: optionalText,
    leadType: z.nativeEnum(LeadType).optional(),
    lead_type: z.nativeEnum(LeadType).optional(),
    lookingTo: optionalText,
    looking_to: optionalText,
    source: optionalText,
    formName: optionalText,
    form_name: optionalText,
    pageUrl: optionalText,
    page_url: optionalText,
    referrer: optionalText,
    budgetMin: optionalInt,
    budget_min: optionalInt,
    budgetMax: optionalInt,
    budget_max: optionalInt,
    desiredLocation: optionalText,
    desired_location: optionalText,
    zipCode: optionalZipText,
    zip_code: optionalZipText,
    postalCode: optionalZipText,
    postal_code: optionalZipText,
    propertyZipCode: optionalZipText,
    property_zip_code: optionalZipText,
    desiredZipCode: optionalZipText,
    desired_zip_code: optionalZipText,
    propertyInterest: optionalText,
    property_interest: optionalText,
    timeframe: optionalText,
    message: optionalText,
    notes: optionalText,
    utmSource: optionalText,
    utm_source: optionalText,
    utmMedium: optionalText,
    utm_medium: optionalText,
    utmCampaign: optionalText,
    utm_campaign: optionalText,
    website: optionalText
  })
  .passthrough();
