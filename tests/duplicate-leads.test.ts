import assert from "node:assert/strict";
import test from "node:test";
import {
  decideDuplicateLead,
  duplicateMatchLabel,
  findDuplicateLeadDecision,
  normalizeDuplicateEmail,
  normalizeDuplicatePhone
} from "../lib/duplicate-leads";

const existingLeads = [
  { id: "lead_email", organizationId: "org_1", email: "avery@example.com", phone: "337-555-0101" },
  { id: "lead_phone", organizationId: "org_1", email: "phone@example.com", phone: "(337) 555-0202" },
  { id: "lead_other_org", organizationId: "org_2", email: "avery@example.com", phone: "3375550202" }
];

function fakeDb() {
  return {
    lead: {
      async findMany(args: { where?: { organizationId?: string; email?: { equals?: string }; phone?: { not?: null } } }) {
        const organizationId = args.where?.organizationId;
        const email = args.where?.email?.equals?.toLowerCase();
        return existingLeads
          .filter((lead) => lead.organizationId === organizationId)
          .filter((lead) => (email ? lead.email.toLowerCase() === email : true))
          .filter((lead) => ("phone" in (args.where ?? {}) ? lead.phone !== null : true))
          .map(({ id, email, phone }) => ({ id, email, phone }));
      }
    }
  };
}

test("new public lead has no duplicate when no email or phone match exists", async () => {
  const decision = await findDuplicateLeadDecision(fakeDb(), "org_1", "new@example.com", "337-555-0303");
  assert.deepEqual(decision, { kind: "no_duplicate", matchedLeadId: null, matchedBy: [] });
});

test("duplicate public lead with same email in same organization does not create a second lead", async () => {
  const decision = await findDuplicateLeadDecision(fakeDb(), "org_1", "avery@example.com", undefined);
  assert.deepEqual(decision, { kind: "duplicate_by_email", matchedLeadId: "lead_email", matchedBy: ["email"] });
});

test("duplicate public lead with same phone in same organization handles formatting differences", async () => {
  const decision = await findDuplicateLeadDecision(fakeDb(), "org_1", undefined, "337.555.0202");
  assert.deepEqual(decision, { kind: "duplicate_by_phone", matchedLeadId: "lead_phone", matchedBy: ["phone"] });
});

test("duplicate public lead with same email and phone in same organization has one clear match", () => {
  const decision = decideDuplicateLead(
    "AVERY@EXAMPLE.COM",
    "337-555-0101",
    [{ id: "lead_email", email: "avery@example.com", phone: "337-555-0101" }],
    [{ id: "lead_email", email: "avery@example.com", phone: "(337) 555-0101" }]
  );

  assert.deepEqual(decision, { kind: "duplicate_by_email_and_phone", matchedLeadId: "lead_email", matchedBy: ["email", "phone"] });
});

test("duplicate public submission activity can label matched email and phone", () => {
  assert.equal(duplicateMatchLabel({ kind: "duplicate_by_email_and_phone", matchedLeadId: "lead_1", matchedBy: ["email", "phone"] }), "email and phone");
});

test("duplicate matching is case-insensitive for email", () => {
  assert.equal(normalizeDuplicateEmail("  Avery@Example.COM "), "avery@example.com");
});

test("duplicate phone matching normalizes common phone formatting", () => {
  assert.equal(normalizeDuplicatePhone("(337) 555-0202"), "3375550202");
  assert.equal(normalizeDuplicatePhone("337.555.0202"), "3375550202");
});

test("same email or phone in a different organization does not block lead creation", async () => {
  const decision = await findDuplicateLeadDecision(fakeDb(), "org_3", "avery@example.com", "337-555-0202");
  assert.deepEqual(decision, { kind: "no_duplicate", matchedLeadId: null, matchedBy: [] });
});

test("missing email and missing phone does not trigger duplicate matching", async () => {
  const decision = await findDuplicateLeadDecision(fakeDb(), "org_1", undefined, undefined);
  assert.deepEqual(decision, { kind: "no_duplicate", matchedLeadId: null, matchedBy: [] });
});

test("email and phone matching different existing leads produces conflict and does not silently merge", () => {
  const decision = decideDuplicateLead(
    "avery@example.com",
    "337-555-0202",
    [{ id: "lead_email", email: "avery@example.com", phone: "337-555-0101" }],
    [{ id: "lead_phone", email: "phone@example.com", phone: "(337) 555-0202" }]
  );

  assert.deepEqual(decision, {
    kind: "duplicate_conflict",
    matchedLeadId: null,
    matchedBy: ["email", "phone"],
    emailLeadId: "lead_email",
    phoneLeadId: "lead_phone"
  });
});
