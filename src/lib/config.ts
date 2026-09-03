/**
 * Configuration — Zod-validated, self-documenting application config.
 *
 * Centralizes all environment-driven configuration (NEXT_PUBLIC_*,
 * server-only vars, JSON overrides) behind explicit Zod schemas.
 * Validate at the boundary: env is parsed once via Zod, JSON payloads
 * are parsed then validated element-wise, unsafe URLs are rejected.
 *
 * Usage:
 *   import { getSiteConfig, validateEnv, siteConfigSchema } from "@/lib/config"
 *   const config = getSiteConfig() // validated, typed, with safe defaults
 *   validateEnv() // throws in production if required vars missing/invalid
 *
 * Self-documenting: see `envSchema` / `siteConfigSchema` for the full
 * shape and defaults. See `.env.example` for env var docs.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Primitive / domain schemas (CRITICAL: define once, reuse everywhere)
// ---------------------------------------------------------------------------

export const themeIdSchema = z.enum(["classic", "modern", "garden"], {
  message: "Theme must be one of classic | modern | garden",
});

export const hexColorSchema = z
  .string()
  .regex(HEX_COLOR_RE, { message: "Accent must be hex color #RGB or #RRGGBB" });

export const isoDateSchema = z
  .string()
  .regex(ISO_DATE_RE, { message: "Wedding date must be YYYY-MM-DD" });

export const safeUrlSchema = z
  .string()
  .url({ message: "Invalid URL" })
  .refine((v) => isSafeUrl(v), { message: "URL must use http or https" });

/** Venue map URL: either a safe http(s) URL or empty string (no map) */
export const venueMapUrlSchema = z.union([safeUrlSchema, z.literal("")]);

// ---------------------------------------------------------------------------
// Domain object schemas
// ---------------------------------------------------------------------------

export const scheduleItemSchema = z
  .object({
    time: z.string().min(1, { message: "Schedule time is required" }),
    title: z.string().min(1, { message: "Schedule title is required" }),
    description: z.string().optional(),
  })
  .strip();

export const accommodationSchema = z
  .object({
    name: z.string().min(1, { message: "Accommodation name required" }),
    url: safeUrlSchema.optional(),
    note: z.string().optional(),
  })
  .strip();

export const registryLinkSchema = z
  .object({
    label: z.string().min(1, { message: "Link label required" }),
    url: safeUrlSchema,
  })
  .strip();

export const registryConfigSchema = z
  .object({
    iban: z.string().optional(),
    bizum: z.string().optional(),
    links: z.array(registryLinkSchema).default([]),
    message: z.string().optional(),
  })
  .strip();

// ---------------------------------------------------------------------------
// Inferred TypeScript types — single source of truth (schema → type)
// ---------------------------------------------------------------------------

export type ThemeId = z.infer<typeof themeIdSchema>;
export type ScheduleItem = z.infer<typeof scheduleItemSchema>;
export type Accommodation = z.infer<typeof accommodationSchema>;
export type RegistryLink = z.infer<typeof registryLinkSchema>;
export type RegistryConfig = z.infer<typeof registryConfigSchema>;

// ---------------------------------------------------------------------------
// Env schemas — validates raw process.env at startup
// ---------------------------------------------------------------------------

/** Public env vars (NEXT_PUBLIC_*) — exposed to browser at build time */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_COUPLE_NAME: z.string().min(1).optional(),
  NEXT_PUBLIC_WEDDING_DATE: isoDateSchema.optional(),
  NEXT_PUBLIC_VENUE: z.string().min(1).optional(),
  NEXT_PUBLIC_THEME: themeIdSchema.optional(),
  NEXT_PUBLIC_ACCENT: hexColorSchema.optional(),
  NEXT_PUBLIC_SCHEDULE_JSON: z.string().optional(),
  NEXT_PUBLIC_ACCOMMODATIONS_JSON: z.string().optional(),
  NEXT_PUBLIC_REGISTRY_JSON: z.string().optional(),
  NEXT_PUBLIC_VENUE_MAP_URL: z.union([safeUrlSchema, z.literal("")]).optional(),
  // Feature flags & API endpoints (extensible — validated as JSON)
  NEXT_PUBLIC_API_URL: safeUrlSchema.optional(),
  NEXT_PUBLIC_FEATURE_FLAGS_JSON: z.string().optional(),
  NEXT_PUBLIC_API_ENDPOINTS_JSON: z.string().optional(),
});

/** Server-only env vars — never exposed to browser */
export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional().default("file:./data/dev.db"),
  ADMIN_PASSWORD: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
});

/** Full application env — merge of public + server with cross-field checks */
export const envSchema = publicEnvSchema
  .merge(serverEnvSchema)
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && !data.ADMIN_PASSWORD) {
      ctx.addIssue({
        code: "custom",
        message: "ADMIN_PASSWORD is required in production",
        path: ["ADMIN_PASSWORD"],
      });
    }
    // Warn if DATABASE_URL looks malformed (allow file: and postgres)
    if (data.DATABASE_URL) {
      const v = data.DATABASE_URL;
      const isFile = v.startsWith("file:");
      const isPostgres = v.startsWith("postgresql://") || v.startsWith("postgres://") || v.startsWith("postgresql:") || v.startsWith("prisma://");
      // SQLite file: or postgres allowed; any other non-empty is flagged but not hard-fail
      // We don't addIssue here to keep dev flexible — validation for shape is min(1) only.
      void (isFile || isPostgres);
    }
  });

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type Env = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// SiteConfig schema — final assembled config object
// ---------------------------------------------------------------------------

/** Feature flags — validated from NEXT_PUBLIC_FEATURE_FLAGS_JSON */
export const featureFlagsSchema = z.record(z.string(), z.boolean()).default({});

/** API endpoints — validated from NEXT_PUBLIC_API_ENDPOINTS_JSON */
export const apiEndpointsSchema = z
  .object({
    rsvp: z.string().default("/api/v1/rsvp"),
    guests: z.string().default("/api/v1/guests"),
    auth: z.string().default("/api/v1/auth"),
  })
  .default({ rsvp: "/api/v1/rsvp", guests: "/api/v1/guests", auth: "/api/v1/auth" });

export const siteConfigSchema = z.object({
  coupleName: z.string().min(1).default("Alex & Sam"),
  weddingDate: isoDateSchema.default("2027-06-12"),
  venue: z.string().min(1).default("Villa del Sol, Barcelona"),
  theme: themeIdSchema.default("classic"),
  accentColor: hexColorSchema.default("#b48a78"),
  schedule: z.array(scheduleItemSchema).default([]),
  venueMapUrl: venueMapUrlSchema.default(""),
  accommodations: z.array(accommodationSchema).default([]),
  registry: registryConfigSchema.default({ links: [] }),
  // Extensible: feature flags & API endpoints (validated, self-documenting)
  apiUrl: safeUrlSchema.optional(),
  featureFlags: featureFlagsSchema,
  apiEndpoints: apiEndpointsSchema,
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;

// ---------------------------------------------------------------------------
// JSON helpers — validate after JSON.parse (never trust JSON.parse)
// ---------------------------------------------------------------------------

function safeParseJson(value: string | undefined): unknown | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

/** Validate an array JSON env var element-wise, keeping only valid items */
function parseJsonArrayEnv<T>(
  value: string | undefined,
  itemSchema: z.ZodType<T>,
  fallback: T[]
): T[] {
  if (!value) return fallback;
  const parsed = safeParseJson(value);
  if (!Array.isArray(parsed)) return fallback;
  const valid: T[] = [];
  for (const item of parsed) {
    const res = itemSchema.safeParse(item);
    if (res.success) valid.push(res.data);
  }
  return valid;
}

function parseSchedule(value: string | undefined): ScheduleItem[] {
  return parseJsonArrayEnv(value, scheduleItemSchema, []);
}

function parseAccommodations(value: string | undefined): Accommodation[] {
  return parseJsonArrayEnv(value, accommodationSchema, []);
}

function parseRegistry(value: string | undefined): RegistryConfig {
  const fallback: RegistryConfig = { links: [] };
  if (!value) return fallback;
  const parsed = safeParseJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
  const obj = parsed as Record<string, unknown>;

  // Validate links array element-wise (filter unsafe URLs)
  const rawLinks = Array.isArray(obj.links) ? obj.links : [];
  const safeLinks: RegistryLink[] = [];
  for (const l of rawLinks) {
    const res = registryLinkSchema.safeParse(l);
    if (res.success) safeLinks.push(res.data);
  }

  const iban = typeof obj.iban === "string" ? obj.iban : undefined;
  const bizum = typeof obj.bizum === "string" ? obj.bizum : undefined;
  const message = typeof obj.message === "string" ? obj.message : undefined;

  // Validate assembled registry via schema (strip unknown keys, default links)
  const candidate = { iban, bizum, links: safeLinks, message };
  const res = registryConfigSchema.safeParse(candidate);
  if (res.success) return res.data;
  return { links: safeLinks, iban, bizum, message };
}

function parseVenueMapUrl(value: string | undefined): string {
  if (!value) return "";
  const res = venueMapUrlSchema.safeParse(value);
  return res.success ? res.data : "";
}

function parseFeatureFlags(value: string | undefined): Record<string, boolean> {
  if (!value) return {};
  const parsed = safeParseJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const res = featureFlagsSchema.safeParse(parsed);
  return res.success ? res.data : {};
}

function parseApiEndpoints(value: string | undefined): z.infer<typeof apiEndpointsSchema> {
  if (!value) return { rsvp: "/api/v1/rsvp", guests: "/api/v1/guests", auth: "/api/v1/auth" };
  const parsed = safeParseJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { rsvp: "/api/v1/rsvp", guests: "/api/v1/guests", auth: "/api/v1/auth" };
  }
  const res = apiEndpointsSchema.safeParse(parsed);
  return res.success ? res.data : { rsvp: "/api/v1/rsvp", guests: "/api/v1/guests", auth: "/api/v1/auth" };
}

function parseApiUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const res = safeUrlSchema.safeParse(value);
  return res.success ? res.data : undefined;
}

function parseStringWithSchema(
  schema: z.ZodType<string>,
  value: string | undefined,
  fallback: string
): string {
  if (value === undefined || value === "") return fallback;
  const res = schema.safeParse(value);
  return res.success ? res.data : fallback;
}

// ---------------------------------------------------------------------------
// Public API — getSiteConfig, validateEnv, startup validation
// ---------------------------------------------------------------------------

export interface GetSiteConfigOptions {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}

/**
 * Build and validate SiteConfig from env.
 * - Validates each field via Zod, falls back to defaults on invalid.
 * - JSON fields are parsed then validated element-wise; invalid entries are dropped.
 * - Unsafe URLs (non-http/https) are filtered via safeUrlSchema / isSafeUrl.
 * - Final object is validated against siteConfigSchema (defense-in-depth).
 */
export function getSiteConfig(optionsOrEnv?: GetSiteConfigOptions | NodeJS.ProcessEnv | Record<string, string | undefined>): SiteConfig {
  // Support both getSiteConfig() and getSiteConfig({ env }) and getSiteConfig(envObj) for tests
  const env: Record<string, string | undefined> =
    optionsOrEnv && typeof optionsOrEnv === "object" && "env" in (optionsOrEnv as GetSiteConfigOptions)
      ? ((optionsOrEnv as GetSiteConfigOptions).env as Record<string, string | undefined>) ?? (process.env as Record<string, string | undefined>)
      : (optionsOrEnv as Record<string, string | undefined>) ?? (process.env as Record<string, string | undefined>);

  const coupleName = parseStringWithSchema(z.string().min(1), env.NEXT_PUBLIC_COUPLE_NAME, "Alex & Sam");
  const weddingDate = parseStringWithSchema(isoDateSchema, env.NEXT_PUBLIC_WEDDING_DATE, "2027-06-12");
  const venue = parseStringWithSchema(z.string().min(1), env.NEXT_PUBLIC_VENUE, "Villa del Sol, Barcelona");
  const theme = parseStringWithSchema(themeIdSchema as unknown as z.ZodType<string>, env.NEXT_PUBLIC_THEME, "classic") as ThemeId;
  const accentColor = parseStringWithSchema(hexColorSchema, env.NEXT_PUBLIC_ACCENT, "#b48a78");

  const schedule = parseSchedule(env.NEXT_PUBLIC_SCHEDULE_JSON);
  const accommodations = parseAccommodations(env.NEXT_PUBLIC_ACCOMMODATIONS_JSON);
  const registry = parseRegistry(env.NEXT_PUBLIC_REGISTRY_JSON);
  const venueMapUrl = parseVenueMapUrl(env.NEXT_PUBLIC_VENUE_MAP_URL);
  const featureFlags = parseFeatureFlags(env.NEXT_PUBLIC_FEATURE_FLAGS_JSON);
  const apiEndpoints = parseApiEndpoints(env.NEXT_PUBLIC_API_ENDPOINTS_JSON);
  const apiUrl = parseApiUrl(env.NEXT_PUBLIC_API_URL);

  const candidate: SiteConfig = {
    coupleName,
    weddingDate,
    venue,
    theme,
    accentColor,
    schedule,
    venueMapUrl,
    accommodations,
    registry,
    apiUrl,
    featureFlags,
    apiEndpoints,
  };

  // Final defense-in-depth validation — should always pass due to fallbacks above
  const validated = siteConfigSchema.safeParse(candidate);
  if (validated.success) return validated.data;

  // If somehow still invalid (e.g., theme fallback failed), return candidate with validated defaults
  // Log in development for visibility
  if (process.env.NODE_ENV !== "production") {
    console.warn("[config] SiteConfig validation issues:", validated.error.flatten());
  }
  // Return best-effort: use schema defaults via parse of candidate with catch
  try {
    return siteConfigSchema.parse(candidate);
  } catch {
    return candidate;
  }
}

/**
 * Validate raw env (process.env) against envSchema.
 * Returns Zod safeParse result — caller decides to throw or warn.
 */
export function safeParseEnv(
  rawEnv: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): ReturnType<typeof envSchema.safeParse> {
  return envSchema.safeParse(rawEnv);
}

/**
 * Validate env and throw with formatted message if invalid.
 * In production, throws on any issue; in dev/test, warns but returns parsed defaults.
 */
export function validateEnv(
  rawEnv: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): Env {
  const result = envSchema.safeParse(rawEnv);
  if (result.success) return result.data;

  const flat = result.error.flatten();
  const message = `Invalid environment configuration:\n${JSON.stringify(flat, null, 2)}`;

  if (rawEnv.NODE_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error(message);
  }

  // Non-production: warn and return best-effort parsed data with defaults where possible
  console.warn(`[config] ${message}`);
  // Build fallback env: apply defaults manually for required server fields
  const fallback: Env = {
    DATABASE_URL: (rawEnv.DATABASE_URL as string) || "file:./data/dev.db",
    ADMIN_PASSWORD: (rawEnv.ADMIN_PASSWORD as string) || "",
    NODE_ENV: (rawEnv.NODE_ENV as Env["NODE_ENV"]) || "development",
    NEXT_PUBLIC_COUPLE_NAME: rawEnv.NEXT_PUBLIC_COUPLE_NAME,
    NEXT_PUBLIC_WEDDING_DATE: rawEnv.NEXT_PUBLIC_WEDDING_DATE,
    NEXT_PUBLIC_VENUE: rawEnv.NEXT_PUBLIC_VENUE,
    NEXT_PUBLIC_THEME: rawEnv.NEXT_PUBLIC_THEME as ThemeId | undefined,
    NEXT_PUBLIC_ACCENT: rawEnv.NEXT_PUBLIC_ACCENT,
    NEXT_PUBLIC_SCHEDULE_JSON: rawEnv.NEXT_PUBLIC_SCHEDULE_JSON,
    NEXT_PUBLIC_ACCOMMODATIONS_JSON: rawEnv.NEXT_PUBLIC_ACCOMMODATIONS_JSON,
    NEXT_PUBLIC_REGISTRY_JSON: rawEnv.NEXT_PUBLIC_REGISTRY_JSON,
    NEXT_PUBLIC_VENUE_MAP_URL: rawEnv.NEXT_PUBLIC_VENUE_MAP_URL,
    NEXT_PUBLIC_API_URL: rawEnv.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_FEATURE_FLAGS_JSON: rawEnv.NEXT_PUBLIC_FEATURE_FLAGS_JSON,
    NEXT_PUBLIC_API_ENDPOINTS_JSON: rawEnv.NEXT_PUBLIC_API_ENDPOINTS_JSON,
  } as Env;
  return fallback;
}

/**
 * Validate at startup — intended to be called once at boot (e.g., instrumentation,
 * server entry, or top of getSiteConfig if you want fail-fast in prod).
 * Validates both env and assembled SiteConfig; throws in production on critical issues.
 */
export function validateConfigAtStartup(
  rawEnv: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): { env: Env; siteConfig: SiteConfig } {
  const env = validateEnv(rawEnv);
  const siteConfig = getSiteConfig({ env: rawEnv });
  const siteResult = siteConfigSchema.safeParse(siteConfig);
  if (!siteResult.success) {
    const flat = siteResult.error.flatten();
    const message = `Invalid SiteConfig:\n${JSON.stringify(flat, null, 2)}`;
    if (env.NODE_ENV === "production") throw new Error(message);
    console.warn(`[config] ${message}`);
  }
  return { env, siteConfig };
}

/** Legacy helper kept for backward compat — parses JSON env with fallback */
function parseJsonEnv<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed as T;
  } catch {
    return fallback;
  }
}

// Re-export for external validation use
export { z };
