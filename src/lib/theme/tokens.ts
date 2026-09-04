import type { ThemeId } from "@/lib/config";
import type { ThemeTokens } from "./types";

/**
 * Static theme token definitions.
 * Colors here are the *thematic* base — the dynamic `accent` is
 * overlaid at runtime via `resolveThemeTokens(accentColor)`.
 *
 * This separates styling (tokens) from component logic (layout).
 */
export const themeTokens: Record<ThemeId, ThemeTokens> = {
  classic: {
    id: "classic",
    label: "Classic Elegance",
    preview: "#fdfbf7",
    colors: {
      background: "#fdfbf7",
      foreground: "#44403c", // stone-700
      card: "#ffffff",
      cardMuted: "rgba(255,255,255,0.6)",
      border: "#e7e5e4", // stone-200
      muted: "#a8a29e", // stone-400
      mutedForeground: "#78716c", // stone-500
      accent: "#b48a78", // fallback, overwritten by SiteConfig.accentColor
      accentMuted: "#b48a7815",
    },
    typography: {
      headingFont: "var(--font-playfair)",
      bodyFont: "var(--font-inter)",
    },
    radius: {
      card: "0px", // classic uses sharp / no rounding on cards
      button: "0px",
    },
    spacing: {
      section: "6rem",
      content: "4rem",
      block: "2rem",
    },
    shadows: {
      card: "0 1px 2px rgba(0,0,0,0.05)",
    },
  },
  modern: {
    id: "modern",
    label: "Modern Minimal",
    preview: "#ffffff",
    colors: {
      background: "#ffffff",
      foreground: "#18181b", // zinc-900
      card: "#ffffff",
      cardMuted: "#fafafa", // zinc-50
      border: "#e4e4e7", // zinc-200
      muted: "#a1a1aa", // zinc-400
      mutedForeground: "#71717a", // zinc-500
      accent: "#b48a78",
      accentMuted: "#b48a7815",
    },
    typography: {
      headingFont: "var(--font-inter)",
      bodyFont: "var(--font-inter)",
    },
    radius: {
      card: "0px",
      button: "0px",
    },
    spacing: {
      section: "6rem",
      content: "4rem",
      block: "2rem",
    },
    shadows: {
      card: "0 1px 2px rgba(0,0,0,0.05)",
    },
  },
  garden: {
    id: "garden",
    label: "Garden Romance",
    preview: "#fbf7f3",
    colors: {
      background: "#fbf7f3",
      foreground: "#44403c", // stone-700
      card: "#ffffff",
      cardMuted: "#fbf7f3",
      border: "#ffffff", // garden cards use white border on muted bg
      muted: "#a8a29e",
      mutedForeground: "#78716c",
      accent: "#b48a78",
      accentMuted: "#b48a7810",
    },
    typography: {
      headingFont: "var(--font-playfair)",
      bodyFont: "var(--font-inter)",
    },
    radius: {
      card: "24px", // garden is very rounded
      button: "9999px", // pill buttons
    },
    spacing: {
      section: "6rem",
      content: "4rem",
      block: "2rem",
    },
    shadows: {
      card: "0 1px 2px rgba(0,0,0,0.05)",
    },
  },
};
