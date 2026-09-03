import type { FC } from "react";
import type { SiteConfig, ThemeId } from "@/lib/config";
import ClassicElegance from "@/components/themes/ClassicElegance";
import ModernMinimal from "@/components/themes/ModernMinimal";
import GardenRomance from "@/components/themes/GardenRomance";
import { themeTokens } from "@/lib/theme/tokens";
import type { ThemeTokens } from "@/lib/theme/types";

export type ThemeDef = {
  id: ThemeId;
  label: string;
  Component: FC<{ config: SiteConfig }>;
  preview: string;
  /** Static design tokens for this theme (accent overlaid at runtime) */
  tokens: ThemeTokens;
};

export const themes: Record<ThemeId, ThemeDef> = {
  classic: {
    id: "classic",
    label: "Classic Elegance",
    Component: ClassicElegance,
    preview: "#fdfbf7",
    tokens: themeTokens.classic,
  },
  modern: {
    id: "modern",
    label: "Modern Minimal",
    Component: ModernMinimal,
    preview: "#ffffff",
    tokens: themeTokens.modern,
  },
  garden: {
    id: "garden",
    label: "Garden Romance",
    Component: GardenRomance,
    preview: "#fbf7f3",
    tokens: themeTokens.garden,
  },
};

// Re-export theming service for consumers that want the service pattern
export { getThemeTokens, resolveThemeTokens, getThemeForConfig, listThemes, isValidThemeId } from "@/lib/theme/service";
export type { ThemeTokens, ResolvedThemeTokens } from "@/lib/theme/types";
