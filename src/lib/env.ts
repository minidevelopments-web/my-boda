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
 * Typed accessor for validated env — validates once and caches.
 * Call early in server startup; subsequent calls return cached result
 * unless `force` is true.
 */
let cachedEnv: ReturnType<typeof validateEnv> | null = null;

export function getValidatedEnv(
  rawEnv: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  opts: { force?: boolean } = {}
): ReturnType<typeof validateEnv> {
  if (cachedEnv && !opts.force) return cachedEnv;
  cachedEnv = validateEnv(rawEnv);
  return cachedEnv;
}

export function clearEnvCache(): void {
  cachedEnv = null;
}
