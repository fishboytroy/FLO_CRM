import assert from "node:assert/strict";
import test from "node:test";
import { LeadAssignmentReason, MembershipRole, OrganizationPlan, OrganizationZipCodeStatus } from "@prisma/client";
import {
  canManageTerritories,
  decideLeadRouting,
  normalizeTerritoryZipCode,
  normalizeTerritoryZipCodes,
  parseTerritoryStatus,
  TerritoryRouteRecord,
  territoryConflictMessage
} from "../lib/territory-zip-codes";

function routeRecord(overrides: Partial<TerritoryRouteRecord> = {}): TerritoryRouteRecord {
  return {
    id: overrides.id ?? "territory_1",
    organizationId: overrides.organizationId ?? "org_match",
    assignedUserId: overrides.assignedUserId ?? null,
    organization: overrides.organization ?? {
      id: overrides.organizationId ?? "org_match",
      name: "Acadia Agent Membership",
      plan: OrganizationPlan.individual,
      memberships: [{ userId: "user_owner", role: MembershipRole.owner }]
    }
  };
}

test("ZIP territory creation accepts valid ZIP", () => {
  assert.deepEqual(normalizeTerritoryZipCode("70508"), { success: true, zipCode: "70508" });
});

test("ZIP territory creation normalizes ZIP+4", () => {
  assert.deepEqual(normalizeTerritoryZipCode("70503-1234"), { success: true, zipCode: "70503" });
});

test("ZIP territory creation rejects invalid ZIP", () => {
  assert.deepEqual(normalizeTerritoryZipCode("Lafayette"), { success: false, error: "Use a valid 5-digit ZIP or ZIP+4" });
});

test("bulk ZIP territory creation normalizes comma space and newline separated values", () => {
  assert.deepEqual(normalizeTerritoryZipCodes("70508, 70503\n70508 70506"), {
    success: true,
    zipCodes: ["70508", "70503", "70506"]
  });
});

test("bulk ZIP territory creation reports the invalid ZIP value", () => {
  assert.deepEqual(normalizeTerritoryZipCodes("70508, Lafayette"), {
    success: false,
    error: 'Invalid ZIP "Lafayette". Use 5-digit ZIPs separated by commas, spaces, or new lines.'
  });
});

test("duplicate active or trialing exclusive ZIP is rejected across organizations", () => {
  const message = territoryConflictMessage([{ id: "territory_1", organizationId: "org_other" }], "org_current");
  assert.equal(message, "This ZIP code is already assigned to another active organization.");
});

test("duplicate active or trialing ZIP is rejected inside same organization", () => {
  const message = territoryConflictMessage([{ id: "territory_1", organizationId: "org_current" }], "org_current");
  assert.equal(message, "This organization already has an active or trialing territory for this ZIP code.");
});

test("expired or canceled ZIP does not block future active territory when excluded from conflict records", () => {
  const message = territoryConflictMessage([], "org_current");
  assert.equal(message, null);
});

test("agent cannot create or update territory", () => {
  assert.equal(canManageTerritories({ role: "agent", isPlatformAdmin: false }, "agent"), false);
});

test("owner, admin, and platform admin can create and update territory", () => {
  assert.equal(canManageTerritories({ role: "owner", isPlatformAdmin: false }, "agent"), true);
  assert.equal(canManageTerritories({ role: "admin", isPlatformAdmin: false }, "agent"), true);
  assert.equal(canManageTerritories({ role: "agent", isPlatformAdmin: true }, "platform_admin"), true);
});

test("cross-organization access is blocked by conflict classification and status parsing stays constrained", () => {
  const message = territoryConflictMessage(
    [
      { id: "territory_1", organizationId: "org_current" },
      { id: "territory_2", organizationId: "org_other" }
    ],
    "org_current",
    "territory_1"
  );
  assert.equal(message, "This ZIP code is already assigned to another active organization.");
  assert.deepEqual(parseTerritoryStatus("active"), { success: true, status: OrganizationZipCodeStatus.active });
  assert.deepEqual(parseTerritoryStatus("sold"), { success: false, error: "Use a valid territory status" });
});

test("public lead with ZIP matching active exclusive territory routes to that organization", () => {
  const decision = decideLeadRouting("70508", "org_internal", [routeRecord()]);

  assert.equal(decision.kind, "zip_match");
  assert.equal(decision.organizationId, "org_match");
  assert.equal(decision.reason, LeadAssignmentReason.zip_match);
  assert.equal(decision.zipCode, "70508");
  assert.match(decision.message, /matched active territory/);
});

test("public lead with ZIP matching trialing exclusive territory routes to that organization", () => {
  const decision = decideLeadRouting("70503", "org_internal", [
    routeRecord({
      id: "trialing_territory",
      organizationId: "org_trialing",
      organization: {
        id: "org_trialing",
        name: "Trialing Team",
        plan: OrganizationPlan.team,
        memberships: []
      }
    })
  ]);

  assert.equal(decision.kind, "zip_match");
  assert.equal(decision.organizationId, "org_trialing");
  assert.equal(decision.assignedAgentId, null);
});

test("public lead with expired or canceled territory falls back when no active match is provided", () => {
  const decision = decideLeadRouting("70506", "org_internal", []);

  assert.equal(decision.kind, "unmatched_zip");
  assert.equal(decision.organizationId, "org_internal");
  assert.equal(decision.reason, LeadAssignmentReason.unpurchased_zip);
  assert.match(decision.message, /No active territory matched ZIP 70506/);
});

test("public lead with unpurchased ZIP falls back to internal organization", () => {
  const decision = decideLeadRouting("99999", "org_internal", []);

  assert.equal(decision.kind, "unmatched_zip");
  assert.equal(decision.organizationId, "org_internal");
  assert.equal(decision.zipCode, "99999");
});

test("public lead with missing ZIP falls back to internal organization", () => {
  const decision = decideLeadRouting(undefined, "org_internal", []);

  assert.equal(decision.kind, "missing_zip");
  assert.equal(decision.organizationId, "org_internal");
  assert.equal(decision.zipCode, null);
  assert.equal(decision.message, "No ZIP code was provided; lead requires manual review.");
});

test("matching individual organization assigns owner to assignedAgentId when available", () => {
  const decision = decideLeadRouting("70508", "org_internal", [routeRecord()]);

  assert.equal(decision.organizationId, "org_match");
  assert.equal(decision.assignedAgentId, "user_owner");
  assert.match(decision.message, /Assigned to the individual account owner/);
});

test("matching individual organization leaves assignment blank without a clear owner", () => {
  const decision = decideLeadRouting("70508", "org_internal", [
    routeRecord({
      organization: {
        id: "org_match",
        name: "Acadia Agent Membership",
        plan: OrganizationPlan.individual,
        memberships: []
      }
    })
  ]);

  assert.equal(decision.organizationId, "org_match");
  assert.equal(decision.assignedAgentId, null);
  assert.match(decision.message, /No clear individual owner/);
});

test("matching team organization leaves assignedAgentId null", () => {
  const decision = decideLeadRouting("70508", "org_internal", [
    routeRecord({
      organizationId: "org_team",
      organization: {
        id: "org_team",
        name: "Bayou Home Team",
        plan: OrganizationPlan.team,
        memberships: [{ userId: "team_owner", role: MembershipRole.owner }]
      }
    })
  ]);

  assert.equal(decision.organizationId, "org_team");
  assert.equal(decision.assignedAgentId, null);
  assert.match(decision.message, /Team account lead was left unassigned/);
});

test("matching team territory assigns the territory agent when one is set", () => {
  const decision = decideLeadRouting("70508", "org_internal", [
    routeRecord({
      organizationId: "org_team",
      assignedUserId: "team_agent",
      organization: {
        id: "org_team",
        name: "Bayou Home Team",
        plan: OrganizationPlan.team,
        memberships: [{ userId: "team_owner", role: MembershipRole.owner }]
      }
    })
  ]);

  assert.equal(decision.organizationId, "org_team");
  assert.equal(decision.assignedAgentId, "team_agent");
  assert.match(decision.message, /Assigned to the ZIP territory agent/);
});

test("LeadAssignmentHistory data can be created from zip_match and fallback decisions", () => {
  const zipMatch = decideLeadRouting("70508", "org_internal", [routeRecord()]);
  assert.deepEqual(
    {
      toOrganizationId: zipMatch.organizationId,
      toUserId: zipMatch.assignedAgentId,
      zipCode: zipMatch.zipCode,
      reason: zipMatch.reason,
      message: zipMatch.message
    },
    {
      toOrganizationId: "org_match",
      toUserId: "user_owner",
      zipCode: "70508",
      reason: LeadAssignmentReason.zip_match,
      message: zipMatch.message
    }
  );

  const fallback = decideLeadRouting(undefined, "org_internal", []);
  assert.deepEqual(
    {
      toOrganizationId: fallback.organizationId,
      toUserId: fallback.assignedAgentId,
      zipCode: fallback.zipCode,
      reason: fallback.reason,
      message: fallback.message
    },
    {
      toOrganizationId: "org_internal",
      toUserId: null,
      zipCode: null,
      reason: LeadAssignmentReason.unpurchased_zip,
      message: "No ZIP code was provided; lead requires manual review."
    }
  );
});

test("multiple matching territories do not guess and fall back for manual review", () => {
  const decision = decideLeadRouting("70508", "org_internal", [
    routeRecord({ id: "territory_1", organizationId: "org_1" }),
    routeRecord({ id: "territory_2", organizationId: "org_2" })
  ]);

  assert.equal(decision.kind, "conflict");
  assert.equal(decision.organizationId, "org_internal");
  assert.equal(decision.reason, LeadAssignmentReason.admin_override);
  assert.match(decision.message, /Multiple active territories matched ZIP 70508/);
});
