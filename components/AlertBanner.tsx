import * as React from "react";

type Tone = "info" | "warn" | "danger";

const TONES: Record<Tone, { wrap: string; icon: React.ReactNode; title: string }> = {
  info: {
    wrap: "border-sky-500/30 bg-sky-500/10 text-sky-100",
    icon: <span>ℹ️</span>,
    title: "Información",
  },
  warn: {
    wrap: "border-orange-500/30 bg-orange-500/10 text-orange-100",
    icon: <span>⚠️</span>,
    title: "Atención",
  },
  danger: {
    wrap: "border-red-500/30 bg-red-500/10 text-red-100",
    icon: <span>🚨</span>,
    title: "Importante",
  },
};

export interface InfoBannerProps {
  tone?: Tone;
  title?: React.ReactNode;
  children: React.ReactNode;
}

export function AlertBanner({
  tone = "info",
  title,
  children,
}: InfoBannerProps) {
  const cfg = TONES[tone];
  return (
    <div
      role="status"
      className={[
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed",
        cfg.wrap,
      ].join(" ")}
    >
      <span aria-hidden="true" className="text-base">
        {cfg.icon}
      </span>
      <div className="min-w-0">
        {title ? (
          <div className="mb-1 font-semibold">{title ?? cfg.title}</div>
        ) : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
