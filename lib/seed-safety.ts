export function assertSeedCanRun(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "production" && env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error("Refusing to run seed in production without ALLOW_PRODUCTION_SEED=true.");
  }
}
