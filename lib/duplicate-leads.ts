import { Prisma } from "@prisma/client";

export type DuplicateLeadRecord = {
  id: string;
  email: string | null;
  phone: string | null;
};

export type DuplicateLeadDecision =
  | { kind: "no_duplicate"; matchedLeadId: null; matchedBy: [] }
  | { kind: "duplicate_by_email"; matchedLeadId: string; matchedBy: ["email"] }
  | { kind: "duplicate_by_phone"; matchedLeadId: string; matchedBy: ["phone"] }
  | { kind: "duplicate_by_email_and_phone"; matchedLeadId: string; matchedBy: ["email", "phone"] }
  | { kind: "duplicate_conflict"; matchedLeadId: null; matchedBy: ["email", "phone"]; emailLeadId: string; phoneLeadId: string };

type DuplicateLeadDb = {
  lead: {
    findMany: (args: Prisma.LeadFindManyArgs) => Promise<unknown>;
  };
};

export function normalizeDuplicateEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  return normalized || undefined;
}

export function normalizeDuplicatePhone(phone?: string | null) {
  const digits = phone?.replace(/\D/g, "");
  return digits || undefined;
}

export function decideDuplicateLead(email: string | undefined, phone: string | undefined, emailMatches: DuplicateLeadRecord[], phoneCandidates: DuplicateLeadRecord[]): DuplicateLeadDecision {
  const normalizedEmail = normalizeDuplicateEmail(email);
  const normalizedPhone = normalizeDuplicatePhone(phone);

  if (!normalizedEmail && !normalizedPhone) return { kind: "no_duplicate", matchedLeadId: null, matchedBy: [] };

  const emailLead = normalizedEmail
    ? emailMatches.find((lead) => normalizeDuplicateEmail(lead.email) === normalizedEmail)
    : undefined;
  const phoneLead = normalizedPhone
    ? phoneCandidates.find((lead) => normalizeDuplicatePhone(lead.phone) === normalizedPhone)
    : undefined;

  if (emailLead && phoneLead && emailLead.id !== phoneLead.id) {
    return {
      kind: "duplicate_conflict",
      matchedLeadId: null,
      matchedBy: ["email", "phone"],
      emailLeadId: emailLead.id,
      phoneLeadId: phoneLead.id
    };
  }

  if (emailLead && phoneLead) {
    return { kind: "duplicate_by_email_and_phone", matchedLeadId: emailLead.id, matchedBy: ["email", "phone"] };
  }

  if (emailLead) return { kind: "duplicate_by_email", matchedLeadId: emailLead.id, matchedBy: ["email"] };
  if (phoneLead) return { kind: "duplicate_by_phone", matchedLeadId: phoneLead.id, matchedBy: ["phone"] };

  return { kind: "no_duplicate", matchedLeadId: null, matchedBy: [] };
}

export async function findDuplicateLeadDecision(db: DuplicateLeadDb, organizationId: string, email?: string, phone?: string) {
  const normalizedEmail = normalizeDuplicateEmail(email);
  const normalizedPhone = normalizeDuplicatePhone(phone);

  if (!normalizedEmail && !normalizedPhone) return { kind: "no_duplicate", matchedLeadId: null, matchedBy: [] } satisfies DuplicateLeadDecision;

  const [emailMatches, phoneCandidates] = await Promise.all([
    normalizedEmail
      ? db.lead.findMany({
          where: { organizationId, email: { equals: normalizedEmail, mode: "insensitive" } },
          select: { id: true, email: true, phone: true },
          orderBy: { updatedAt: "desc" }
        })
      : Promise.resolve([]),
    normalizedPhone
      ? db.lead.findMany({
          where: { organizationId, phone: { not: null } },
          select: { id: true, email: true, phone: true },
          orderBy: { updatedAt: "desc" }
        })
      : Promise.resolve([])
  ]);

  return decideDuplicateLead(email, phone, emailMatches as DuplicateLeadRecord[], phoneCandidates as DuplicateLeadRecord[]);
}

export function duplicateMatchLabel(decision: DuplicateLeadDecision) {
  if (decision.kind === "duplicate_by_email") return "email";
  if (decision.kind === "duplicate_by_phone") return "phone";
  if (decision.kind === "duplicate_by_email_and_phone") return "email and phone";
  if (decision.kind === "duplicate_conflict") return "email and phone matched different existing leads";
  return "none";
}
