"use client";

import * as React from "react";
import { useThemeOptional } from "@/components/theme/ThemeContext";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: "primary" | "secondary";
    accentColor?: string;
    loading?: boolean;
    href?: string;
  };

export function Button({
  variant = "primary",
  accentColor,
  loading = false,
  href,
  className = "",
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const themeCtx = useThemeOptional();
  // Prefer explicit prop, then theme token, then undefined (rely on CSS)
  const resolvedAccent = accentColor ?? themeCtx?.tokens.colors.accent;

  const base =
    "inline-flex items-center justify-center rounded-md px-7 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50";
  const variantClass =
    variant === "primary"
      ? "text-white shadow-sm hover:opacity-90"
      : "border bg-white hover:bg-gray-50 text-gray-900";

  const accentStyle =
    variant === "primary" && resolvedAccent
      ? { backgroundColor: resolvedAccent, ...style }
      : style;

  if (href) {
    return (
      <a
        href={href}
        className={`${base} ${variantClass} ${className}`}
        style={accentStyle}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variantClass} ${className}`}
      style={accentStyle}
      {...props}
    >
      {loading ? "Sending..." : children}
    </button>
  );
}
