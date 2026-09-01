import type { FC } from "react";
import type { SiteConfig, ThemeId } from "@/lib/config";
import ClassicElegance from "@/components/themes/ClassicElegance";
import ModernMinimal from "@/components/themes/ModernMinimal";
import GardenRomance from "@/components/themes/GardenRomance";

export type ThemeDef = {
  id: ThemeId;
  label: string;
  Component: FC<{ config: SiteConfig }>;
  preview: string;
};

export const themes: Record<ThemeId, ThemeDef> = {
  classic: {
    id: "classic",
    label: "Classic Elegance",
    Component: ClassicElegance,
    preview: "#fdfbf7",
  },
  modern: {
    id: "modern",
    label: "Modern Minimal",
    Component: ModernMinimal,
    preview: "#ffffff",
  },
  garden: {
    id: "garden",
    label: "Garden Romance",
    Component: GardenRomance,
    preview: "#fbf7f3",
  },
};
