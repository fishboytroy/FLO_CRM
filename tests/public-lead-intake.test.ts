import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit, resetRateLimitForTests } from "../lib/rate-limit";
import {
  corsHeaders,
  inferLeadType,
  isAllowedOrigin,
  normalizePublicLead,
  splitName,
  verifyApiKey
} from "../lib/public-lead-intake";

test("origin checks allow server-to-server requests and the configured website only", () => {
  const allowed = "https://lafayettelouisianarealestate.com";

  assert.equal(isAllowedOrigin(null, allowed), true);
  assert.equal(isAllowedOrigin(allowed, allowed), true);
  assert.equal(isAllowedOrigin("https://example.com", allowed), false);
  assert.equal(corsHeaders(allowed, allowed)["Access-Control-Allow-Origin"], allowed);
  assert.equal("Access-Control-Allow-Origin" in corsHeaders("https://example.com", allowed), false);
});

test("API key verification requires an exact header key", () => {
  assert.equal(verifyApiKey("secret", "secret"), true);
  assert.equal(verifyApiKey("secret", "different"), false);
  assert.equal(verifyApiKey(undefined, "secret"), false);
  assert.equal(verifyApiKey("secret", undefined), false);
});

test("lead intake normalizes Lafayette website form payloads", () => {
  const normalized = normalizePublicLead({
    fullName: "Avery Thibodeaux",
    email: "avery@example.com",
    phone: "337-555-0202",
    lookingTo: "buy a home",
    source: "Buy or Sell a Home in Lafayette",
    pageUrl: "https://lafayettelouisianarealestate.com/buy-or-sell-a-home-in-lafayette/",
    budgetMin: "300000",
    budgetMax: "450000",
    desiredLocation: "Lafayette, LA",
    message: "Interested in homes near River Ranch."
  });

  assert.equal(normalized.success, true);
  if (!normalized.success) throw new Error("Expected normalized lead");
  assert.equal(normalized.data.firstName, "Avery");
  assert.equal(normalized.data.lastName, "Thibodeaux");
  assert.equal(normalized.data.leadType, "buyer");
  assert.equal(normalized.data.budgetMin, 300000);
  assert.equal(normalized.data.source, "Buy or Sell a Home in Lafayette");
  assert.match(normalized.data.notes ?? "", /Page URL/);
});

test("lead intake catches honeypot spam without creating a normal lead payload", () => {
  const normalized = normalizePublicLead({
    fullName: "Spam Bot",
    email: "spam@example.com",
    website: "https://spam.example"
  });

  assert.equal(normalized.success, true);
  if (!normalized.success) throw new Error("Expected normalized lead");
  assert.equal(normalized.data.spam, true);
});

test("lead intake requires a first name or full name", () => {
  const normalized = normalizePublicLead({ email: "person@example.com" });

  assert.equal(normalized.success, false);
  if (normalized.success) throw new Error("Expected validation failure");
  assert.equal(normalized.error, "First name or full name is required");
});

test("name and lead type helpers cover common website inputs", () => {
  assert.deepEqual(splitName("Cher Guidry"), { firstName: "Cher", lastName: "Guidry" });
  assert.deepEqual(splitName("Cher"), { firstName: "Cher", lastName: "Website Lead" });
  assert.equal(inferLeadType("home valuation request"), "seller");
  assert.equal(inferLeadType("invest in duplexes"), "investor");
  assert.equal(inferLeadType("rental inquiry"), "renter");
  assert.equal(inferLeadType("just browsing"), "unknown");
});

test("rate limiter blocks requests over the configured window limit", () => {
  resetRateLimitForTests();

  assert.equal(checkRateLimit("lead:127.0.0.1", 2, 60_000, 1_000).allowed, true);
  assert.equal(checkRateLimit("lead:127.0.0.1", 2, 60_000, 2_000).allowed, true);
  assert.equal(checkRateLimit("lead:127.0.0.1", 2, 60_000, 3_000).allowed, false);
  assert.equal(checkRateLimit("lead:127.0.0.1", 2, 60_000, 62_000).allowed, true);
});
