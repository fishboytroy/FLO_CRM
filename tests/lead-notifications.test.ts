import assert from "node:assert/strict";
import test from "node:test";
import { LeadType, PipelineStage } from "@prisma/client";
import { buildLeadNotificationEmail, sendLeadNotification } from "../lib/email/lead-notifications";

const lead = {
  id: "lead_1",
  firstName: "Avery",
  lastName: "Thibodeaux",
  email: "avery@example.com",
  phone: "337-555-0202",
  leadType: LeadType.buyer,
  source: "Homepage form",
  zipCode: "70508",
  timeframe: "ASAP",
  desiredLocation: "Lafayette",
  propertyInterest: "Single-family home",
  notes: "Interested near River Ranch.",
  status: PipelineStage.new_lead
};

test("new lead notification email includes useful lead context", () => {
  const email = buildLeadNotificationEmail({
    lead,
    organization: { name: "Acadia Agent Membership" },
    recipients: [{ email: "owner@example.com", name: "Owner" }],
    reviewAssignment: null
  });

  assert.equal(email.subject, "New Lafayette Real Estate Lead: Buyer 70508");
  assert.match(email.text, /Lead: Avery Thibodeaux/);
  assert.match(email.text, /Email: avery@example.com/);
  assert.match(email.text, /ZIP: 70508/);
});

test("new non-duplicate public lead can trigger notification through mocked sender", async () => {
  let sent = false;
  const result = await sendLeadNotification(
    {
      lead,
      organization: { name: "Acadia Agent Membership" },
      recipients: [{ email: "owner@example.com", name: "Owner" }]
    },
    async (message) => {
      sent = true;
      assert.equal(message.to[0].email, "owner@example.com");
      return { ok: true };
    }
  );

  assert.equal(sent, true);
  assert.deepEqual(result, { ok: true });
});

test("email send failure does not throw and can be handled without failing lead creation", async () => {
  const result = await sendLeadNotification(
    {
      lead,
      organization: { name: "Acadia Agent Membership" },
      recipients: [{ email: "owner@example.com", name: "Owner" }]
    },
    async () => ({ ok: false, error: "Email provider returned 500" })
  );

  assert.deepEqual(result, { ok: false, error: "Email provider returned 500" });
});

test("notification is skipped when no recipients are available", async () => {
  const result = await sendLeadNotification({
    lead,
    organization: { name: "Acadia Agent Membership" },
    recipients: []
  });

  assert.deepEqual(result, { ok: true, skipped: true, reason: "No notification recipients configured" });
});
