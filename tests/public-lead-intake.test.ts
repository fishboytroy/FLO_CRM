import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit, resetRateLimitForTests } from "../lib/rate-limit";
import { leadSchema } from "../lib/validation";
import {
  corsHeaders,
  duplicateLeadActivityMessage,
  duplicateLeadUpdateData,
  inferLeadType,
  isAllowedOrigin,
  normalizePublicLead,
  normalizeZipCode,
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

test("public lead intake accepts zipCode", () => {
  const normalized = normalizePublicLead({
    fullName: "Avery Thibodeaux",
    email: "avery@example.com",
    zipCode: "70508"
  });

  assert.equal(normalized.success, true);
  if (!normalized.success) throw new Error("Expected normalized lead");
  assert.equal(normalized.data.zipCode, "70508");
});

test("public lead intake accepts zip_code", () => {
  const normalized = normalizePublicLead({
    full_name: "Camille Broussard",
    phone: "337-555-0144",
    zip_code: "70501"
  });

  assert.equal(normalized.success, true);
  if (!normalized.success) throw new Error("Expected normalized lead");
  assert.equal(normalized.data.zipCode, "70501");
});

test("public lead intake accepts postalCode", () => {
  const normalized = normalizePublicLead({
    name: "Julien Landry",
    email: "julien@example.com",
    postalCode: "70503"
  });

  assert.equal(normalized.success, true);
  if (!normalized.success) throw new Error("Expected normalized lead");
  assert.equal(normalized.data.zipCode, "70503");
});

test("public lead intake normalizes ZIP+4 to five digits", () => {
  const normalized = normalizePublicLead({
    fullName: "Noelle Arceneaux",
    email: "noelle@example.com",
    propertyZipCode: "70506-1234"
  });

  assert.equal(normalized.success, true);
  if (!normalized.success) throw new Error("Expected normalized lead");
  assert.equal(normalized.data.zipCode, "70506");
  assert.deepEqual(normalizeZipCode("70507-9876"), { success: true, zipCode: "70507" });
});

test("public lead intake rejects invalid ZIP values", () => {
  const normalized = normalizePublicLead({
    fullName: "Invalid Zip",
    email: "invalid@example.com",
    desired_zip_code: "Lafayette"
  });

  assert.equal(normalized.success, false);
  if (normalized.success) throw new Error("Expected validation failure");
  assert.equal(normalized.error, "Zip code must be a valid 5-digit ZIP or ZIP+4");
});

test("public lead intake still works without ZIP code", () => {
  const normalized = normalizePublicLead({
    fullName: "Marie Hebert",
    email: "marie@example.com",
    lookingTo: "Sell a home"
  });

  assert.equal(normalized.success, true);
  if (!normalized.success) throw new Error("Expected normalized lead");
  assert.equal(normalized.data.zipCode, undefined);
});

test("internal lead validation normalizes optional ZIP+4", () => {
  const parsed = leadSchema.safeParse({
    firstName: "Avery",
    lastName: "Thibodeaux",
    email: "avery@example.com",
    leadType: "buyer",
    status: "new_lead",
    zipCode: "70508-1234"
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) throw new Error("Expected valid lead");
  assert.equal(parsed.data.zipCode, "70508");
});

test("internal lead validation rejects invalid ZIP", () => {
  const parsed = leadSchema.safeParse({
    firstName: "Avery",
    lastName: "Thibodeaux",
    email: "avery@example.com",
    leadType: "buyer",
    status: "new_lead",
    zipCode: "Lafayette"
  });

  assert.equal(parsed.success, false);
  if (parsed.success) throw new Error("Expected invalid lead");
  assert.deepEqual(parsed.error.flatten().fieldErrors.zipCode, ["Use a valid 5-digit ZIP or ZIP+4"]);
});

test("lead intake requires a first name or full name", () => {
  const normalized = normalizePublicLead({ email: "person@example.com" });

  assert.equal(normalized.success, false);
  if (normalized.success) throw new Error("Expected validation failure");
  assert.equal(normalized.error, "First name or full name is required");
});

test("duplicate lead updates fill only blank lead fields", () => {
  const normalized = normalizePublicLead({
    fullName: "Avery Thibodeaux",
    email: "avery@example.com",
    phone: "337-555-0202",
    source: "Homepage buyer seller form",
    desiredLocation: "Lafayette, LA",
    budgetMin: "300000",
    budgetMax: "450000",
    lookingTo: "Buy a home",
    timeframe: "ASAP",
    message: "New duplicate submission context."
  });

  assert.equal(normalized.success, true);
  if (!normalized.success) throw new Error("Expected normalized lead");

  assert.deepEqual(
    duplicateLeadUpdateData(
      {
        email: "existing@example.com",
        phone: null,
        source: "Original source",
        budgetMin: null,
        budgetMax: 500000,
        desiredLocation: null,
        zipCode: null,
        propertyInterest: null,
        timeframe: "Next 90 days",
        notes: null
      },
      normalized.data
    ),
    {
      phone: "337-555-0202",
      budgetMin: 300000,
      desiredLocation: "Lafayette, LA",
      propertyInterest: "Buy a home",
      notes: "New duplicate submission context."
    }
  );
});

test("duplicate lead updates persist zipCode only when existing lead is blank", () => {
  const normalized = normalizePublicLead({
    fullName: "Avery Thibodeaux",
    email: "avery@example.com",
    zipCode: "70508"
  });

  assert.equal(normalized.success, true);
  if (!normalized.success) throw new Error("Expected normalized lead");

  const blankZipUpdate = duplicateLeadUpdateData(
    {
      email: "avery@example.com",
      phone: null,
      source: null,
      budgetMin: null,
      budgetMax: null,
      desiredLocation: null,
      zipCode: null,
      propertyInterest: null,
      timeframe: null,
      notes: null
    },
    normalized.data
  );
  assert.equal(blankZipUpdate.zipCode, "70508");

  const existingZipUpdate = duplicateLeadUpdateData(
    {
      email: "avery@example.com",
      phone: null,
      source: null,
      budgetMin: null,
      budgetMax: null,
      desiredLocation: null,
      zipCode: "70501",
      propertyInterest: null,
      timeframe: null,
      notes: null
    },
    normalized.data
  );
  assert.equal("zipCode" in existingZipUpdate, false);
});

test("duplicate lead activity captures new submission context", () => {
  const normalized = normalizePublicLead({
    fullName: "Avery Thibodeaux",
    email: "avery@example.com",
    phone: "337-555-0202",
    source: "Homepage buyer seller form",
    lookingTo: "Buy a home",
    timeframe: "ASAP",
    message: "Still interested after seeing a new listing."
  });

  assert.equal(normalized.success, true);
  if (!normalized.success) throw new Error("Expected normalized lead");

  const message = duplicateLeadActivityMessage(normalized.data, "email and phone");
  assert.match(message, /Duplicate public lead submission received from Homepage buyer seller form/);
  assert.match(message, /Matched by: email and phone/);
  assert.match(message, /Email: avery@example.com/);
  assert.match(message, /Phone: 337-555-0202/);
  assert.match(message, /New context:/);
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
