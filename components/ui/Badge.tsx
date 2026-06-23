"use client";

import * as React from "react";

type Tone = "high" | "nominal" | "low" | "muted" | "live";

const TONES: Record<Tone, string> = {
  high: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
  nominal: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30",
  low: "bg-yellow-500/15 text-yellow-200 ring-1 ring-yellow-500/30",
  muted: "bg-zinc-700/40 text-zinc-300 ring-1 ring-zinc-600/40",
  live: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "muted", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        "uppercase tracking-wide",
        TONES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}
