import assert from "node:assert/strict";
import test from "node:test";
import { assertSeedCanRun } from "../lib/seed-safety";

test("seed guard allows non-production environments", () => {
  assert.doesNotThrow(() => assertSeedCanRun({ NODE_ENV: "development" }));
  assert.doesNotThrow(() => assertSeedCanRun({}));
});

test("seed guard blocks production by default", () => {
  assert.throws(() => assertSeedCanRun({ NODE_ENV: "production" }), /Refusing to run seed in production/);
});

test("seed guard allows production only with explicit override", () => {
  assert.doesNotThrow(() => assertSeedCanRun({ NODE_ENV: "production", ALLOW_PRODUCTION_SEED: "true" }));
});
