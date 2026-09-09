"use client";

import * as React from "react";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warning" | "info" | "muted";
};

/**
 * Shared status pill. Unified focus/disabled language with Button
 * (focus-visible ring); color variants for attending / meal / category.
 */
export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  const variantClass =
    variant === "success"
      ? "bg-green-100 text-green-800 border-green-200"
      : variant === "warning"
        ? "bg-amber-100 text-amber-900 border-amber-200"
        : variant === "info"
          ? "bg-blue-100 text-blue-800 border-blue-200"
          : variant === "muted"
            ? "bg-gray-100 text-gray-600 border-gray-200"
            : "bg-stone-100 text-stone-700 border-stone-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
