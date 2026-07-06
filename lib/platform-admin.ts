import { MembershipRole, OrganizationPlan, OrganizationStatus } from "@prisma/client";

export const PLATFORM_ORGANIZATION_PLANS = [OrganizationPlan.individual, OrganizationPlan.team] as const;
export const PLATFORM_ORGANIZATION_STATUSES = [
  OrganizationStatus.active,
  OrganizationStatus.trialing,
  OrganizationStatus.past_due,
  OrganizationStatus.canceled
] as const;
export const PLATFORM_MEMBERSHIP_ROLES = [MembershipRole.owner, MembershipRole.admin, MembershipRole.agent] as const;

export function isPlatformAdminRole(role?: string | null) {
  return role === "platform_admin";
}

export function parsePlatformOrganizationPlan(raw: unknown) {
  if (typeof raw !== "string" || !(PLATFORM_ORGANIZATION_PLANS as readonly string[]).includes(raw)) {
    return { success: false as const, error: "Use individual or team for organization plan" };
  }
  return { success: true as const, plan: raw as (typeof PLATFORM_ORGANIZATION_PLANS)[number] };
}

export function parsePlatformOrganizationStatus(raw: unknown, fallback = OrganizationStatus.active) {
  if (raw === undefined || raw === null || raw === "") return { success: true as const, status: fallback };
  if (typeof raw !== "string" || !(PLATFORM_ORGANIZATION_STATUSES as readonly string[]).includes(raw)) {
    return { success: false as const, error: "Use a valid organization status" };
  }
  return { success: true as const, status: raw as OrganizationStatus };
}

export function parsePlatformMembershipRole(raw: unknown) {
  if (typeof raw !== "string" || !(PLATFORM_MEMBERSHIP_ROLES as readonly string[]).includes(raw)) {
    return { success: false as const, error: "Use owner, admin, or agent for membership role" };
  }
  return { success: true as const, role: raw as MembershipRole };
}

export function normalizePlatformEmail(raw: unknown) {
  if (typeof raw !== "string") return { success: false as const, error: "Email is required" };
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false as const, error: "Use a valid email address" };
  return { success: true as const, email };
}

export function normalizeOrganizationName(raw: unknown) {
  if (typeof raw !== "string") return { success: false as const, error: "Organization name is required" };
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2) return { success: false as const, error: "Organization name is required" };
  if (name.length > 120) return { success: false as const, error: "Organization name must be 120 characters or fewer" };
  return { success: true as const, name };
}

export function slugifyOrganizationName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "organization";
}
