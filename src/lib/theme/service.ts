import type { SiteConfig, ThemeId } from "@/lib/config";
import { themeTokens } from "./tokens";
import type { ThemeTokens, ResolvedThemeTokens } from "./types";

/**
 * Theming Service — pure functions, no React.
 * Single Responsibility: resolve and supply theme tokens.
 * Components never hard-code colors; they ask the service (via context/hook).
 */

const VALID_THEMES = new Set<ThemeId>(["classic", "modern", "garden"]);

export function isValidThemeId(id: string): id is ThemeId {
  return VALID_THEMES.has(id as ThemeId);
}

export function getThemeTokens(themeId: ThemeId): ThemeTokens {
  return themeTokens[themeId] ?? themeTokens.classic;
}

export function listThemes(): ThemeTokens[] {
  return Object.values(themeTokens);
}

/**
 * Resolve tokens with the runtime accentColor.
 * Keeps accent dynamic per deployment while tokens stay static per theme.
 */
export function resolveThemeTokens(themeId: ThemeId, accentColor: string): ResolvedThemeTokens {
  const base = getThemeTokens(themeId);
  const accent = accentColor || base.colors.accent;
  return {
    ...base,
    colors: {
      ...base.colors,
      accent,
      accentMuted: `${accent}15`,
    },
  };
}

/**
 * Convenience: resolve from full SiteConfig.
 */
export function getThemeForConfig(config: SiteConfig): ResolvedThemeTokens {
  const themeId = isValidThemeId(config.theme) ? config.theme : "classic";
  return resolveThemeTokens(themeId, config.accentColor);
}

/**
 * Helper to build CSS variable style for accent.
 */
export function getThemeCssVars(tokens: ThemeTokens): React.CSSProperties {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ["--accent" as any]: tokens.colors.accent,
    ["--accent-muted" as any]: tokens.colors.accentMuted,
    ["--theme-bg" as any]: tokens.colors.background,
    ["--theme-fg" as any]: tokens.colors.foreground,
  } as React.CSSProperties;
}
