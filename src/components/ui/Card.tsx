"use client";

import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "muted";
};

/**
 * Shared surface primitive for guest-facing cards (registry, info,
 * accommodations, admin stats). Same border/radius/shadow language
 * everywhere; focus ring matches Button for keyboard users.
 */
export function Card({ variant = "default", className = "", children, ...props }: CardProps) {
  const variantClass =
    variant === "muted" ? "bg-stone-50 border-stone-200" : "bg-white border-stone-200";
  return (
    <div
      className={`rounded border ${variantClass} p-6 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
