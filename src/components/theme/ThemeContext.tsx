"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { SiteConfig } from "@/lib/config";
import type { ResolvedThemeTokens } from "@/lib/theme/types";
import { getThemeForConfig, getThemeCssVars } from "@/lib/theme/service";

export type ThemeContextValue = {
  tokens: ResolvedThemeTokens;
  config: SiteConfig;
  themeId: ResolvedThemeTokens["id"];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = {
  config: SiteConfig;
  children?: React.ReactNode;
  /** Optional explicit tokens override (for testing / A/B) */
  tokens?: ResolvedThemeTokens;
};

export function ThemeProvider({ config, children, tokens: override }: ThemeProviderProps) {
  const value = useMemo<ThemeContextValue>(() => {
    const tokens = override ?? getThemeForConfig(config);
    return {
      tokens,
      config,
      themeId: tokens.id,
    };
  }, [config, override]);

  const style = useMemo(() => getThemeCssVars(value.tokens), [value.tokens]);

  return (
    <ThemeContext.Provider value={value}>
      <div style={style}>{children}</div>
    </ThemeContext.Provider>
  );
}

/**
 * Dedicated hook — components consume theme tokens via this hook,
 * never by prop-drilling accentColor or importing theme files directly.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

/**
 * Safe variant that returns null outside provider (for components
 * that can work with or without theme context, e.g. Button fallback).
 */
export function useThemeOptional(): ThemeContextValue | null {
  return useContext(ThemeContext);
}

export default ThemeContext;
