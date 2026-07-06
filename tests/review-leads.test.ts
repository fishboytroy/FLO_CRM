import assert from "node:assert/strict";
import test from "node:test";
import { LeadAssignmentReason } from "@prisma/client";
import { isReviewAssignment, reviewLeadWhere, reviewReasonLabel } from "../lib/review-leads";

test("missing ZIP public lead assignment is classified for manual review", () => {
  const record = {
    reason: LeadAssignmentReason.unpurchased_zip,
    message: "No ZIP code was provided; lead requires manual review."
  };

  assert.equal(isReviewAssignment(record), true);
  assert.equal(reviewReasonLabel(record), "Missing ZIP");
});

test("unpurchased ZIP public lead assignment is classified for manual review", () => {
  const record = {
    reason: LeadAssignmentReason.unpurchased_zip,
    message: "No active territory matched ZIP 99999; lead requires manual review."
  };

  assert.equal(isReviewAssignment(record), true);
  assert.equal(reviewReasonLabel(record), "No Purchased ZIP Match");
});

test("expired or canceled ZIP fallback appears as review through unpurchased assignment reason", () => {
  const record = {
    reason: LeadAssignmentReason.unpurchased_zip,
    message: "No active territory matched ZIP 70508; lead requires manual review."
  };

  assert.equal(isReviewAssignment(record), true);
});

test("conflicting territory match is classified as territory conflict", () => {
  const record = {
    reason: LeadAssignmentReason.admin_override,
    message: "Multiple active territories matched ZIP 70508; lead was sent to the fallback organization for manual review."
  };

  assert.equal(isReviewAssignment(record), true);
  assert.equal(reviewReasonLabel(record), "Territory Conflict");
});

test("matching purchased ZIP lead does not appear in unmatched review list", () => {
  const record = {
    reason: LeadAssignmentReason.zip_match,
    message: "ZIP 70508 matched active territory for Acadia Agent Membership. Assigned to the individual account owner."
  };

  assert.equal(isReviewAssignment(record), false);
});

test("no clear owner assignment is classified for owner review", () => {
  const record = {
    reason: LeadAssignmentReason.zip_match,
    message: "ZIP 70508 matched active territory for Acadia Agent Membership. No clear individual owner was found, so agent assignment was left blank."
  };

  assert.equal(isReviewAssignment(record), true);
  assert.equal(reviewReasonLabel(record), "Owner Assignment Review");
});

test("review lead query is scoped to one organization", () => {
  assert.deepEqual(reviewLeadWhere("org_internal_lafayette"), {
    organizationId: "org_internal_lafayette",
    assignmentHistory: {
      some: {
        OR: [
          { reason: { in: [LeadAssignmentReason.unpurchased_zip, LeadAssignmentReason.admin_override] } },
          { message: { contains: "No clear individual owner" } }
        ]
      }
    }
  });
});
