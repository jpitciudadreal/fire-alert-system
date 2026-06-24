"use client";

import * as React from "react";

type Tone = "high" | "nominal" | "low" | "muted" | "live";

const TONES: Record<Tone, string> = {
  high:    "bg-fire/15 text-fire ring-1 ring-fire/30",
  nominal: "bg-amber/15 text-amber ring-1 ring-amber/30",
  low:     "bg-yellow-400/15 text-yellow-400 ring-1 ring-yellow-400/30",
  muted:   "bg-surfaceHi text-textSecondary ring-1 ring-border",
  live:    "bg-green-400/15 text-green-400 ring-1 ring-green-400/30",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "muted", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-xs font-medium uppercase tracking-wide",
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
