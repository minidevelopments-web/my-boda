/**
 * Env — centralized environment validation.
 *
 * Thin wrapper around `src/lib/config.ts` schemas for server-side
 * startup validation. Import this in server entry points, instrumentation,
 * or API routes to fail fast on misconfiguration.
 *
 *   import { validateEnv, envSchema, type Env } from "@/lib/env"
 *   validateEnv() // throws in production if ADMIN_PASSWORD missing, etc.
 *
 * Re-exports all config schemas for convenience.
 */
import {
  envSchema,
  publicEnvSchema,
  serverEnvSchema,
  themeIdSchema,
  hexColorSchema,
  isoDateSchema,
  safeUrlSchema,
  venueMapUrlSchema,
  scheduleItemSchema,
  accommodationSchema,
  registryLinkSchema,
  registryConfigSchema,
  siteConfigSchema,
  featureFlagsSchema,
  apiEndpointsSchema,
  validateEnv,
  safeParseEnv,
  validateConfigAtStartup,
  isSafeUrl,
} from "./config";

export {
  envSchema,
  publicEnvSchema,
  serverEnvSchema,
  themeIdSchema,
  hexColorSchema,
  isoDateSchema,
  safeUrlSchema,
  venueMapUrlSchema,
  scheduleItemSchema,
  accommodationSchema,
  registryLinkSchema,
  registryConfigSchema,
  siteConfigSchema,
  featureFlagsSchema,
  apiEndpointsSchema,
  validateEnv,
  safeParseEnv,
  validateConfigAtStartup,
  isSafeUrl,
};

export type { Env, PublicEnv, ServerEnv, SiteConfig, ThemeId, ScheduleItem, Accommodation, RegistryConfig, RegistryLink } from "./config";

/**
 * Validate server env strictly — useful at server boot.
 * Alias for validateEnv with explicit intent.
 */
export function validateServerEnv(
  rawEnv: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
) {
  return validateEnv(rawEnv);
}

/**
 * Typed accessor for validated env — pure per-request (no global cache).
 *
 * Previous implementation cached `validateEnv` result in a mutable global
 * `cachedEnv`, which made tests that mutate `process.env` fragile unless
 * they remembered to call `clearEnvCache()`. This version is pure:
 * every call validates the provided `rawEnv` (or current `process.env`)
 * and returns a fresh result. No global state, no invalidation needed.
 *
 * For callers that want explicit caching/DI, cache the return value
 * locally or pass `rawEnv` explicitly:
 *
 *   const env = getValidatedEnv(process.env); // per-request
 *   // or DI:
 *   const env = validateEnv(myEnvObj);
 *
 * `clearEnvCache` is retained as a no-op for backward compatibility with
 * existing tests; `opts.force` is also a no-op.
 */
export function getValidatedEnv(
  rawEnv: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  _opts: { force?: boolean } = {}
): ReturnType<typeof validateEnv> {
  return validateEnv(rawEnv);
}

/** @deprecated No-op — `getValidatedEnv` is now pure per-request and has no global cache. Kept for backward compat. */
export function clearEnvCache(): void {
  // no-op
}
