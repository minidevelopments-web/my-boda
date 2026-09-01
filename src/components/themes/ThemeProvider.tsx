import { FC } from "react";
import type { SiteConfig } from "@/lib/config";
import { themes } from "@/lib/themes";

export const ThemeProvider: FC<{ config: SiteConfig }> = ({ config }) => {
  const ThemeComponent = themes[config.theme]?.Component ?? themes.classic.Component;
  return <ThemeComponent config={config} />;
};

export default ThemeProvider;
