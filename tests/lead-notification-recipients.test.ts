import assert from "node:assert/strict";
import test from "node:test";
import { MembershipRole, OrganizationPlan } from "@prisma/client";
import { selectLeadNotificationRecipients, uniqueRecipients } from "../lib/lead-notification-recipients";

test("individual organization lead notifies assigned owner/user when assignedAgentId exists", () => {
  const recipients = selectLeadNotificationRecipients(
    {
      id: "org_1",
      plan: OrganizationPlan.individual,
      memberships: [{ role: MembershipRole.owner, user: { id: "owner", email: "owner@example.com", name: "Owner" } }]
    },
    { id: "assigned", email: "assigned@example.com", name: "Assigned" }
  );

  assert.deepEqual(recipients, [{ email: "assigned@example.com", name: "Assigned" }]);
});

test("individual organization without assignedAgentId falls back to owner and admin recipients", () => {
  const recipients = selectLeadNotificationRecipients(
    {
      id: "org_1",
      plan: OrganizationPlan.individual,
      memberships: [
        { role: MembershipRole.owner, user: { id: "owner", email: "owner@example.com", name: "Owner" } },
        { role: MembershipRole.admin, user: { id: "admin", email: "admin@example.com", name: "Admin" } }
      ]
    },
    null
  );

  assert.deepEqual(recipients, [
    { email: "owner@example.com", name: "Owner" },
    { email: "admin@example.com", name: "Admin" }
  ]);
});

test("team organization lead notifies owner/admin recipients, not all agents", () => {
  const recipients = selectLeadNotificationRecipients(
    {
      id: "org_team",
      plan: OrganizationPlan.team,
      memberships: [
        { role: MembershipRole.owner, user: { id: "owner", email: "owner@example.com", name: "Owner" } },
        { role: MembershipRole.admin, user: { id: "admin", email: "admin@example.com", name: "Admin" } },
        { role: MembershipRole.agent, user: { id: "agent", email: "agent@example.com", name: "Agent" } }
      ]
    },
    null
  );

  assert.deepEqual(recipients, [
    { email: "owner@example.com", name: "Owner" },
    { email: "admin@example.com", name: "Admin" }
  ]);
});

test("fallback internal review lead notifies fallback email if no owner/admin contacts exist", () => {
  const recipients = selectLeadNotificationRecipients({ id: "org_internal", plan: OrganizationPlan.internal, memberships: [] }, null, "fallback@example.com");
  assert.deepEqual(recipients, [{ email: "fallback@example.com" }]);
});

test("recipient helper deduplicates emails and ignores users without email", () => {
  const recipients = uniqueRecipients([
    { id: "1", email: "Owner@Example.com", name: "Owner" },
    { id: "2", email: "owner@example.com", name: "Owner Duplicate" },
    { id: "3", email: null, name: "No Email" },
    { id: "4", email: "admin@example.com", name: "Admin" }
  ]);

  assert.deepEqual(recipients, [
    { email: "owner@example.com", name: "Owner" },
    { email: "admin@example.com", name: "Admin" }
  ]);
});
