export type ThemeId = "classic" | "modern" | "garden";
export type ScheduleItem = { time: string; title: string; description?: string };
export type Accommodation = { name: string; url?: string; note?: string };
export type RegistryConfig = { iban?: string; bizum?: string; links: { label: string; url: string }[]; message?: string };

export type SiteConfig = {
  coupleName: string;
  weddingDate: string;
  venue: string;
  theme: ThemeId;
  accentColor: string;
  schedule: ScheduleItem[];
  venueMapUrl: string;
  accommodations: Accommodation[];
  registry: RegistryConfig;
};

function parseJsonEnv<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function getSiteConfig(): SiteConfig {
  const schedule = parseJsonEnv<ScheduleItem[]>(process.env.NEXT_PUBLIC_SCHEDULE_JSON, []);
  const accommodations = parseJsonEnv<Accommodation[]>(process.env.NEXT_PUBLIC_ACCOMMODATIONS_JSON, []);
  const rawRegistry = parseJsonEnv<RegistryConfig | null>(process.env.NEXT_PUBLIC_REGISTRY_JSON, { links: [] });
  const registry = rawRegistry && typeof rawRegistry === "object" ? rawRegistry : { links: [] as RegistryConfig["links"] };
  // Ensure registry.links is always an array even if env provides partial object; filter unsafe URLs
  const rawLinks = Array.isArray((registry as RegistryConfig).links) ? (registry as RegistryConfig).links : [];
  const safeLinks = rawLinks.filter(
    (l) =>
      l !== null &&
      typeof l === "object" &&
      typeof (l as { label?: unknown }).label === "string" &&
      typeof (l as { url?: unknown }).url === "string" &&
      isSafeUrl((l as { url: string }).url)
  );
  const normalizedRegistry: RegistryConfig = {
    iban: (registry as RegistryConfig).iban,
    bizum: (registry as RegistryConfig).bizum,
    links: safeLinks,
    message: (registry as RegistryConfig).message,
  };
  const rawVenueMapUrl = process.env.NEXT_PUBLIC_VENUE_MAP_URL || "";
  const venueMapUrl = rawVenueMapUrl && isSafeUrl(rawVenueMapUrl) ? rawVenueMapUrl : "";
  return {
    coupleName: process.env.NEXT_PUBLIC_COUPLE_NAME || "Alex & Sam",
    weddingDate: process.env.NEXT_PUBLIC_WEDDING_DATE || "2027-06-12",
    venue: process.env.NEXT_PUBLIC_VENUE || "Villa del Sol, Barcelona",
    theme: (process.env.NEXT_PUBLIC_THEME as ThemeId) || "classic",
    accentColor: process.env.NEXT_PUBLIC_ACCENT || "#b48a78",
    schedule: Array.isArray(schedule) ? schedule : [],
    venueMapUrl,
    accommodations: Array.isArray(accommodations) ? accommodations.filter((acc) =>
    acc &&
    typeof acc === "object" &&
    typeof (acc as { url?: unknown }).url === "string" &&
    isSafeUrl((acc as { url: string }).url)
  ) : [],
    registry: normalizedRegistry,
  };
}
