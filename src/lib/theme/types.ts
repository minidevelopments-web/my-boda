import type { ThemeId } from "@/lib/config";

export type ThemeColors = {
  /** Page background */
  background: string;
  /** Primary foreground / text */
  foreground: string;
  /** Card / surface background */
  card: string;
  /** Muted card / subtle section background */
  cardMuted: string;
  /** Border color */
  border: string;
  /** Muted text */
  muted: string;
  /** Muted foreground */
  mutedForeground: string;
  /** Accent — resolved from SiteConfig.accentColor at runtime */
  accent: string;
  /** Accent with opacity helpers (e.g. for subtle backgrounds) */
  accentMuted: string;
};

export type ThemeTypography = {
  headingFont: string;
  bodyFont: string;
};

export type ThemeRadius = {
  card: string;
  button: string;
};

export type ThemeTokens = {
  id: ThemeId;
  label: string;
  preview: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  radius: ThemeRadius;
};

/** Resolved tokens carry the runtime accentColor merged in */
export type ResolvedThemeTokens = ThemeTokens;
