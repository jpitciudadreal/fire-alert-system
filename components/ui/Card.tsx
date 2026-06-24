"use client";

import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds subtle padding */
  padded?: boolean;
}

/**
 * Card — contenedor simple sobre `bg-surface` con borde `border-border`.
 * Réplica del estilo fire-alert-web: sin glassmorphism ni gradiente.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, children, padded = true, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={[
        "rounded-2xl border border-border bg-surface text-textPrimary",
        "shadow-2xl shadow-black/40",
        padded ? "p-5 sm:p-6" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
});

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-textPrimary sm:text-lg">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-1 text-sm text-textSecondary">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
