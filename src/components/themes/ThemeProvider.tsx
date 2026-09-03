"use client";

import { FC, ReactNode } from "react";
import type { SiteConfig } from "@/lib/config";
import { themes } from "@/lib/themes";
import { ThemeProvider as BaseThemeProvider } from "@/components/theme/ThemeContext";

/**
 * ThemeProvider (legacy path, now powered by Theming Service + Context).
 *
 * Supports two usages:
 *  1. Legacy renderer: <ThemeProvider config={config} /> — renders the selected theme component wrapped in context
 *  2. Context provider: <ThemeProvider config={config}><Children /></ThemeProvider> — provides tokens to children
 *
 * This separates styling (tokens/service) from component logic (layout/behavior).
 * Components consume theme via `useTheme()` hook, never via prop-drilling accentColor.
 */
export const ThemeProvider: FC<{ config: SiteConfig; children?: ReactNode }> = ({ config, children }) => {
  if (children) {
    return <BaseThemeProvider config={config}>{children}</BaseThemeProvider>;
  }
  const ThemeComponent = themes[config.theme]?.Component ?? themes.classic.Component;
  return (
    <BaseThemeProvider config={config}>
      <ThemeComponent config={config} />
    </BaseThemeProvider>
  );
};

export default ThemeProvider;
