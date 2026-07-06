import assert from "node:assert/strict";
import test from "node:test";
import { MembershipRole, OrganizationPlan, OrganizationStatus } from "@prisma/client";
import {
  isPlatformAdminRole,
  normalizeOrganizationName,
  normalizePlatformEmail,
  parsePlatformMembershipRole,
  parsePlatformOrganizationPlan,
  parsePlatformOrganizationStatus,
  slugifyOrganizationName
} from "../lib/platform-admin";

test("platform admin role check stays strict", () => {
  assert.equal(isPlatformAdminRole("platform_admin"), true);
  assert.equal(isPlatformAdminRole("admin"), false);
  assert.equal(isPlatformAdminRole("agent"), false);
  assert.equal(isPlatformAdminRole(undefined), false);
});

test("platform organization validation allows paid plans only", () => {
  assert.deepEqual(parsePlatformOrganizationPlan("individual"), { success: true, plan: OrganizationPlan.individual });
  assert.deepEqual(parsePlatformOrganizationPlan("team"), { success: true, plan: OrganizationPlan.team });
  assert.deepEqual(parsePlatformOrganizationPlan("internal"), { success: false, error: "Use individual or team for organization plan" });
});

test("platform organization status defaults to active and rejects unknown statuses", () => {
  assert.deepEqual(parsePlatformOrganizationStatus(undefined), { success: true, status: OrganizationStatus.active });
  assert.deepEqual(parsePlatformOrganizationStatus("trialing"), { success: true, status: OrganizationStatus.trialing });
  assert.deepEqual(parsePlatformOrganizationStatus("archived"), { success: false, error: "Use a valid organization status" });
});

test("platform membership role validation accepts owner admin and agent", () => {
  assert.deepEqual(parsePlatformMembershipRole("owner"), { success: true, role: MembershipRole.owner });
  assert.deepEqual(parsePlatformMembershipRole("admin"), { success: true, role: MembershipRole.admin });
  assert.deepEqual(parsePlatformMembershipRole("agent"), { success: true, role: MembershipRole.agent });
  assert.deepEqual(parsePlatformMembershipRole("platform_admin"), { success: false, error: "Use owner, admin, or agent for membership role" });
});

test("platform input normalization trims names and emails", () => {
  assert.deepEqual(normalizeOrganizationName("  Acadiana   Test Team  "), { success: true, name: "Acadiana Test Team" });
  assert.deepEqual(normalizePlatformEmail(" OWNER@Example.COM "), { success: true, email: "owner@example.com" });
  assert.deepEqual(normalizePlatformEmail("not-an-email"), { success: false, error: "Use a valid email address" });
});

test("organization slug generation is stable and conservative", () => {
  assert.equal(slugifyOrganizationName("Acadiana Test Team"), "acadiana-test-team");
  assert.equal(slugifyOrganizationName("Avery & Broussard Realty, LLC"), "avery-and-broussard-realty-llc");
  assert.equal(slugifyOrganizationName("!!!"), "organization");
});
