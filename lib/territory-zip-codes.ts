import { LeadAssignmentReason, MembershipRole, OrganizationPlan, OrganizationZipCodeStatus, Prisma } from "@prisma/client";
import { ActiveOrganization } from "@/lib/access";

export const TERRITORY_MANAGE_ROLES = ["owner", "admin"] as const;
export const TERRITORY_ACTIVE_STATUSES = [OrganizationZipCodeStatus.active, OrganizationZipCodeStatus.trialing] as const;
export const TERRITORY_STATUSES = [
  OrganizationZipCodeStatus.active,
  OrganizationZipCodeStatus.trialing,
  OrganizationZipCodeStatus.expired,
  OrganizationZipCodeStatus.canceled
] as const;

export type TerritoryConflictRecord = {
  id: string;
  organizationId: string;
};

export type TerritoryRouteRecord = {
  id: string;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    plan: OrganizationPlan;
    memberships: { userId: string; role: MembershipRole }[];
  };
};

export type TerritoryRoutingDecision = {
  kind: "zip_match" | "missing_zip" | "unmatched_zip" | "conflict";
  organizationId: string;
  assignedAgentId: string | null;
  reason: LeadAssignmentReason;
  zipCode: string | null;
  message: string;
};

type TerritoryRoutingDb = {
  organizationZipCode: {
    findMany: (args: Prisma.OrganizationZipCodeFindManyArgs) => Promise<unknown>;
  };
};

export function normalizeTerritoryZipCode(raw?: string | number | null) {
  if (raw === undefined || raw === null || raw === "") return { success: false as const, error: "ZIP code is required" };
  const trimmed = String(raw).trim();
  const match = trimmed.match(/^(\d{5})(?:-\d{4})?$/);
  if (!match) return { success: false as const, error: "Use a valid 5-digit ZIP or ZIP+4" };
  return { success: true as const, zipCode: match[1] };
}

export function parseTerritoryStatus(raw: unknown, fallback = OrganizationZipCodeStatus.active) {
  if (raw === undefined || raw === null || raw === "") return { success: true as const, status: fallback };
  if (typeof raw !== "string" || !TERRITORY_STATUSES.includes(raw as OrganizationZipCodeStatus)) {
    return { success: false as const, error: "Use a valid territory status" };
  }
  return { success: true as const, status: raw as OrganizationZipCodeStatus };
}

export function isActiveTerritoryStatus(status: OrganizationZipCodeStatus) {
  return TERRITORY_ACTIVE_STATUSES.includes(status as (typeof TERRITORY_ACTIVE_STATUSES)[number]);
}

export function canManageTerritories(activeOrg: Pick<ActiveOrganization, "role" | "isPlatformAdmin">, userRole?: string | null) {
  return activeOrg.isPlatformAdmin || userRole === "platform_admin" || userRole === "admin" || TERRITORY_MANAGE_ROLES.includes(activeOrg.role as never);
}

export function territoryConflictMessage(records: TerritoryConflictRecord[], organizationId: string, excludeId?: string) {
  const conflicts = records.filter((record) => record.id !== excludeId);
  const crossOrgConflict = conflicts.find((record) => record.organizationId !== organizationId);
  if (crossOrgConflict) return "This ZIP code is already assigned to another active organization.";

  const sameOrgConflict = conflicts.find((record) => record.organizationId === organizationId);
  if (sameOrgConflict) return "This organization already has an active or trialing territory for this ZIP code.";

  return null;
}

export function decideLeadRouting(zipCode: string | undefined, fallbackOrganizationId: string, matches: TerritoryRouteRecord[]): TerritoryRoutingDecision {
  if (!zipCode) {
    return {
      kind: "missing_zip",
      organizationId: fallbackOrganizationId,
      assignedAgentId: null,
      reason: LeadAssignmentReason.unpurchased_zip,
      zipCode: null,
      message: "No ZIP code was provided; lead requires manual review."
    };
  }

  if (matches.length === 0) {
    return {
      kind: "unmatched_zip",
      organizationId: fallbackOrganizationId,
      assignedAgentId: null,
      reason: LeadAssignmentReason.unpurchased_zip,
      zipCode,
      message: `No active territory matched ZIP ${zipCode}; lead requires manual review.`
    };
  }

  if (matches.length > 1) {
    return {
      kind: "conflict",
      organizationId: fallbackOrganizationId,
      assignedAgentId: null,
      reason: LeadAssignmentReason.admin_override,
      zipCode,
      message: `Multiple active territories matched ZIP ${zipCode}; lead was sent to the fallback organization for manual review.`
    };
  }

  const match = matches[0];
  const owners = match.organization.memberships.filter((membership) => membership.role === MembershipRole.owner);
  const isIndividual = match.organization.plan === OrganizationPlan.individual;
  const assignedAgentId = isIndividual && owners.length === 1 ? owners[0].userId : null;
  const assignmentNote = isIndividual
    ? assignedAgentId
      ? " Assigned to the individual account owner."
      : " No clear individual owner was found, so agent assignment was left blank."
    : match.organization.plan === OrganizationPlan.team
      ? " Team account lead was left unassigned for admin review."
      : "";

  return {
    kind: "zip_match",
    organizationId: match.organizationId,
    assignedAgentId,
    reason: LeadAssignmentReason.zip_match,
    zipCode,
    message: `ZIP ${zipCode} matched active territory for ${match.organization.name}.${assignmentNote}`
  };
}

export async function getLeadRoutingDecision(db: TerritoryRoutingDb, zipCode: string | undefined, fallbackOrganizationId: string) {
  if (!zipCode) return decideLeadRouting(undefined, fallbackOrganizationId, []);

  const matches = await db.organizationZipCode.findMany({
    where: {
      zipCode,
      exclusive: true,
      status: { in: [OrganizationZipCodeStatus.active, OrganizationZipCodeStatus.trialing] }
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          plan: true,
          memberships: {
            select: { userId: true, role: true },
            where: { role: MembershipRole.owner },
            orderBy: { createdAt: "asc" }
          }
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return decideLeadRouting(zipCode, fallbackOrganizationId, matches as TerritoryRouteRecord[]);
}
