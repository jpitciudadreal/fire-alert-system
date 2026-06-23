import { Badge } from "@/components/ui/Badge";
import type { FirePoint } from "@/types";

interface FireListProps {
  fires: FirePoint[];
  /** How many recent fires to render (sorted by acquisition time desc) */
  limit?: number;
  emptyText?: string;
}

export function FireList({
  fires,
  limit = 10,
  emptyText = "No hay fuegos activos en este momento.",
}: FireListProps) {
  const sorted = [...fires]
    .sort((a, b) => {
      const da = `${a.acq_date} ${a.acq_time}`;
      const db = `${b.acq_date} ${b.acq_time}`;
      return db.localeCompare(da);
    })
    .slice(0, limit);

  if (sorted.length === 0) {
    return (
      <p className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-zinc-500">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
      {sorted.map((fire) => (
        <li
          key={fire.fire_id}
          className="flex items-start justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/[0.03]"
        >
          <div className="min-w-0 space-y-1">
            {/*
              Row 1 — province (or "Sin provincia" if the point didn't
              land inside any known Spanish province bbox). Province is
              the primary identifier so it gets the most prominent style.
            */}
            <div className="flex items-center gap-2">
              <Badge
                tone={
                  fire.confidence === "high"
                    ? "high"
                    : fire.confidence === "low"
                      ? "low"
                      : "nominal"
                }
              >
                {fire.confidence}
              </Badge>
              <span className="truncate font-semibold text-zinc-50">
                {fire.province ? titleCase(fire.province) : "Sin provincia"}
              </span>
            </div>
            {/*
              Row 2 — explicit coordinates underneath the province,
              monospaced so the decimal points line up across rows in
              the list. Always visible so the user never has to click
              "Ver en mapa" just to see the lat/lng. `font-mono` resolves
              to Geist_Mono, loaded by `app/layout.tsx`.
            */}
            <div className="font-mono text-xs text-zinc-400">
              {fire.latitude.toFixed(3)}°, {fire.longitude.toFixed(3)}°
            </div>
            {/*
              Row 3 — acquisition timestamp + thermal-brightness hint.
              Kept as the lowest-emphasis line.
            */}
            <div className="text-xs text-zinc-500">
              {fire.acq_date} · {fire.acq_time.slice(0, 2)}:
              {fire.acq_time.slice(2)} UTC · brillo {fire.brightness.toFixed(1)}K
            </div>
          </div>
          <a
            href={`https://www.openstreetmap.org/?mlat=${fire.latitude}&mlon=${fire.longitude}#map=10/${fire.latitude}/${fire.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-medium text-orange-300 hover:text-orange-200"
          >
            Ver en mapa →
          </a>
        </li>
      ))}
    </ul>
  );
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
