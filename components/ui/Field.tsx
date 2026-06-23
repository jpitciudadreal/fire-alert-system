"use client";

import * as React from "react";
import type { FieldError } from "react-hook-form";

export interface FieldProps {
  label: string;
  htmlFor: string;
  error?: FieldError | { message?: string };
  hint?: React.ReactNode;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  const errorMessage = error?.message ? String(error.message) : undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-zinc-200"
      >
        {label}
      </label>
      {children}
      {hint && !errorMessage ? (
        <p className="text-xs text-zinc-500">{hint}</p>
      ) : null}
      {errorMessage ? (
        <p
          id={`${htmlFor}-error`}
          className="text-xs font-medium text-red-400"
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
        "block w-full rounded-xl border bg-zinc-900/60 px-3.5 py-2.5 text-sm",
        "text-zinc-100 placeholder:text-zinc-500 outline-none",
        "transition-colors duration-200",
        "focus:ring-2 focus:ring-orange-500/40",
        invalid
          ? "border-red-500/60 focus:border-red-400"
          : "border-zinc-700 focus:border-orange-500",
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
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={[
        "block w-full appearance-none rounded-xl border border-zinc-700",
        "bg-zinc-900/60 px-3.5 py-2.5 pr-9 text-sm text-zinc-100 outline-none",
        "transition-colors duration-200 focus:ring-2 focus:ring-orange-500/40",
        "focus:border-orange-500",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23a1a1aa%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>')]",
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
