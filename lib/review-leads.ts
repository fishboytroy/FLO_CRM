import { LeadAssignmentReason, Prisma } from "@prisma/client";

export const REVIEW_ASSIGNMENT_REASONS = [LeadAssignmentReason.unpurchased_zip, LeadAssignmentReason.admin_override] as const;
export const NO_CLEAR_OWNER_REVIEW_TEXT = "No clear individual owner";

export type ReviewAssignmentRecord = {
  reason: LeadAssignmentReason;
  message: string | null;
};

export function isReviewAssignment(record: ReviewAssignmentRecord) {
  return REVIEW_ASSIGNMENT_REASONS.includes(record.reason as (typeof REVIEW_ASSIGNMENT_REASONS)[number]) || Boolean(record.message?.includes(NO_CLEAR_OWNER_REVIEW_TEXT));
}

export function reviewReasonLabel(record?: ReviewAssignmentRecord | null) {
  if (!record) return "Needs Manual Review";
  if (record.reason === LeadAssignmentReason.admin_override) return "Territory Conflict";
  if (record.message?.includes("No ZIP code was provided")) return "Missing ZIP";
  if (record.message?.includes("No active territory matched")) return "No Purchased ZIP Match";
  if (record.message?.includes(NO_CLEAR_OWNER_REVIEW_TEXT)) return "Owner Assignment Review";
  return "Unmatched ZIP";
}

export function reviewLeadWhere(organizationId: string): Prisma.LeadWhereInput {
  return {
    organizationId,
    assignmentHistory: {
      some: {
        OR: [
          { reason: { in: [...REVIEW_ASSIGNMENT_REASONS] } },
          { message: { contains: NO_CLEAR_OWNER_REVIEW_TEXT } }
        ]
      }
    }
  };
}
