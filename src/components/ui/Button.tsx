import * as React from "react";

type ButtonProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: "primary" | "secondary";
  accentColor?: string;
};

export function Button({
  variant = "primary",
  accentColor,
  className = "",
  children,
  style,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md px-7 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50";
  const variantClass =
    variant === "primary"
      ? "text-white shadow-sm hover:opacity-90"
      : "border bg-white hover:bg-gray-50 text-gray-900";

  const accentStyle =
    variant === "primary" && accentColor
      ? { backgroundColor: accentColor, ...style }
      : style;

  return (
    <a className={`${base} ${variantClass} ${className}`} style={accentStyle} {...props}>
      {children}
    </a>
  );
}
