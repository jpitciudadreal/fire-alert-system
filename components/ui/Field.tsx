"use client";

import * as React from "react";
import type { FieldError } from "react-hook-form";

export interface FieldProps {
  label: string;
  htmlFor: string;
  error?: FieldError | { message?: string };
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: FieldProps) {
  const errorMessage = error?.message ? String(error.message) : undefined;

  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-textPrimary">
        {label}
      </label>
      {children}
      {hint && !errorMessage ? (
        <p className="text-xs text-textSecondary">{hint}</p>
      ) : null}
      {errorMessage ? (
        <p
          id={`${htmlFor}-error`}
          className="text-xs font-medium text-fire"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...rest }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={[
        "block w-full rounded-xl border bg-base px-3.5 py-2.5 text-sm text-textPrimary",
        "placeholder:text-textSecondary/50 outline-none transition-colors",
        "focus:border-fire",
        invalid ? "border-fire/60" : "border-border",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={[
        "block w-full appearance-none rounded-xl border bg-base px-3.5 py-2.5 pr-9 text-sm text-textPrimary outline-none transition-colors focus:border-fire",
        invalid ? "border-fire/60" : "border-border",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238B9DC3%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>')]",
        "bg-[length:12px_12px] bg-[right_12px_center] bg-no-repeat",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </select>
  );
});
