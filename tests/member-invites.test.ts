import assert from "node:assert/strict";
import test from "node:test";
import { MembershipRole } from "@prisma/client";
import {
  buildMemberInviteEmail,
  createInviteToken,
  hashInviteToken,
  inviteExpirationDate,
  validatePassword
} from "../lib/member-invites";

test("member invite tokens are random and stored as stable hashes", () => {
  const first = createInviteToken();
  const second = createInviteToken();

  assert.notEqual(first, second);
  assert.equal(hashInviteToken(first), hashInviteToken(first));
  assert.notEqual(hashInviteToken(first), first);
});

test("member invite expiration defaults to 72 hours", () => {
  const now = new Date("2026-07-09T12:00:00.000Z");
  assert.equal(inviteExpirationDate(now).toISOString(), "2026-07-12T12:00:00.000Z");
});

test("password validation requires length and basic complexity", () => {
  assert.deepEqual(validatePassword("short"), { success: false, error: "Password must be at least 10 characters" });
  assert.deepEqual(validatePassword("longpassword"), { success: false, error: "Password must include uppercase, lowercase, and a number" });
  assert.deepEqual(validatePassword("Longpassword1"), { success: true, password: "Longpassword1" });
});

test("member invite email includes role organization and setup link", () => {
  const message = buildMemberInviteEmail({
    to: { email: "agent@example.com", name: "Agent" },
    organizationName: "National Realty",
    role: MembershipRole.owner,
    inviteUrl: "https://crm.example.com/onboarding/set-password?token=abc",
    expiresAt: new Date("2026-07-12T12:00:00.000Z")
  });

  assert.equal(message.to[0].email, "agent@example.com");
  assert.match(message.subject, /invited/);
  assert.match(message.text, /National Realty/);
  assert.match(message.text, /Owner/);
  assert.match(message.text, /token=abc/);
});
