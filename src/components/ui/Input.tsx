"use client";

import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  error?: string | null;
  hint?: string | null;
  loading?: boolean;
};

/**
 * Shared text-field primitive. Unified states with Button:
 * - focus-visible ring, disabled opacity, loading via aria-busy + disabled.
 * Label/error wiring is built in so guest forms stay accessible.
 */
export function Input({
  label,
  error,
  hint,
  loading = false,
  id,
  className = "",
  disabled,
  required,
  ...props
}: InputProps) {
  const generated = React.useId();
  const inputId = id ?? `input-${generated}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint && !error ? `${inputId}-hint` : undefined;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium">
          {label}{" "}
          {required && (
            <span aria-hidden="true" className="text-red-600">
              *
            </span>
          )}
        </label>
      )}
      <input
        id={inputId}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-required={required || undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={errorId ?? hintId}
        required={required}
        className={`mt-1 w-full rounded-md border px-3 py-2 text-sm transition-colors focus:border-black focus:outline-none focus:ring-1 focus:ring-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${
          error ? "border-red-500" : ""
        } ${className}`}
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-sm text-gray-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default Input;
