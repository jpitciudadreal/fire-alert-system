import { detectProvince } from "@/lib/data/provinces";
import type { ConfidenceLevel, FirePoint, FireResponse } from "@/types";
import { isFirmsConfigured } from "@/types";

/** VIIRS_SNPP_NRT gives 375m resolution and is the most common public source */
const FIRMS_SOURCE = "VIIRS_SNPP_NRT";
/**
 * Bounding box for mainland Spain + Balearic + Canary islands. Kept as a
 * typed constant so the URL and the defensive post-fetch filter stay in
 * lockstep — change one, you must change both.
 *
 *   - W = -18° (west of El Hierro, Canarias)
 *   - S =  27° (south of Fuerteventura, Canarias)
 *   - E =  +5° (Cap de Creus, Catalonia)
 *   - N =  44° (Estaca de Bares, Galicia)
 *
 * NB: a previous version used `13,-5.5,4.5,29.5`, which was wrong — it
 * requested a region roughly Poland→Germany at Mediterranean latitude
 * and is the reason this is now a typed constant rather than a magic
 * string in the URL.
 */
const SPAIN_BBOX = { west: -18, south: 27, east: 5, north: 44 } as const;

/** NASA FIRMS /api/area path-seg form: `W,S,E,N`. */
const FIRMS_REGION = `${SPAIN_BBOX.west},${SPAIN_BBOX.south},${SPAIN_BBOX.east},${SPAIN_BBOX.north}`;

/**
 * Cheap point-in-bbox check against `SPAIN_BBOX`. Used as a defensive
 * filter on every fire returned by FIRMS so we never display anything
 * outside Spain even if the upstream endpoint silently falls back to
 * the global `world` area for an unrecognised `area` segment.
 */
function isInSpain(lat: number, lng: number): boolean {
  return detectProvince(lat, lng) !== undefined;
}

/** How many days back to look for active fires (max 10 for NRT) */
const FIRMS_DAYS = 3;

/** Fuentes de satélites que se consultarán en paralelo */
const FIRMS_SOURCES = [
  "VIIRS_SNPP_NRT",
  "VIIRS_NOAA20_NRT",
  "VIIRS_NOAA21_NRT",
  "MODIS_NRT"
];

/**
 * Fetch active wildfires for Spain from NASA FIRMS.
 *
 * Failure modes are surfaced via the `reason` field along with an empty
 * `fires` array — the app NEVER serves synthetic data. Specifically:
 *
 *   - No API key  → `reason: "no-key"`. UI shows an actionable
 *                   "configura NASA_FIRMS_API_KEY" message.
 *   - 401/403     → `reason: "invalid-key"`. The upstream rejected the key.
 *   - Other HTTP/network failure → `reason: "network"`.
 *   - Empty FIRMS answer (rows === 0) → `reason: "empty"`. That's a real
 *                     observation: no fires in Spain in the requested window.
 *   - Otherwise → `reason` absent and `fires` contains the FIRMS rows
 *                     with province attribution.
 *
 * The previous behaviour (a 20-point mock dataset served as a silent
 * fallback) has been removed because it conflated real-time monitoring
 * with a curated demo and made the page claim to show actual detections.
 */
export async function getFires(): Promise<FireResponse> {
  if (!isFirmsConfigured()) {
    return {
      source: "nasa-firms",
      reason: "no-key",
      count: 0,
      fetchedAt: new Date().toISOString(),
      fires: [],
    };
  }

  try {
    const raw = await fetchFiresFromFirms();

    if (raw.length === 0) {
      return {
        source: "nasa-firms",
        reason: "empty",
        count: 0,
        fetchedAt: new Date().toISOString(),
        fires: [],
      };
    }

    return {
      source: "nasa-firms",
      count: raw.length,
      fetchedAt: new Date().toISOString(),
      fires: raw.map(enrichProvince),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Keep in sync with the throw site in fetchFiresFromFirms below.
    const reason: FireResponse["reason"] = /responded with (401|403)/i.test(
      message,
    )
      ? "invalid-key"
      : "network";

    if (process.env.NODE_ENV !== "production") {
      // Helpful dev-only breadcrumb when searching for "why is it empty?".
      console.error(`[firms] ${reason} — ${message}`);
    }

    // Empty dataset + reason. We never reach for a synthetic dataset —
    // the UI renders an actionable message based on `reason`.
    return {
      source: "nasa-firms",
      reason,
      count: 0,
      fetchedAt: new Date().toISOString(),
      fires: [],
    };
  }
}

/** Performs the actual HTTP requests to NASA FIRMS for all sources and combines them. */
async function fetchFiresFromFirms(): Promise<FirePoint[]> {
  const key = process.env.NASA_FIRMS_API_KEY;
  if (!key) return [];

  // Hacemos fetch a todas las fuentes de satélites en paralelo
  const promises = FIRMS_SOURCES.map(async (source) => {
    const url =
      `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}` +
      `/${source}/${FIRMS_REGION}/${FIRMS_DAYS}`;

    try {
      const res = await fetch(url, {
        // Re-fetch at most every hour
        next: { revalidate: 60 * 60 },
        headers: { Accept: "text/csv" },
      });

      if (!res.ok) {
        console.error(`[firms] Source ${source} responded with ${res.status}`);
        return [];
      }

      const csv = await res.text();
      return parseCsv(csv).filter((f) => isInSpain(f.latitude, f.longitude));
    } catch (e) {
      console.error(`[firms] Failed to fetch source ${source}:`, e);
      return [];
    }
  });

  const results = await Promise.all(promises);
  
  // Unimos todos los focos y eliminamos duplicados si los hubiera por coordenadas exactas y tiempo
  const combined = results.flat();
  const seen = new Set<string>();
  const uniqueFires: FirePoint[] = [];

  for (const fire of combined) {
    // Generar una clave de deduplicación basada en coordenadas, fecha y hora
    const key = `${fire.latitude.toFixed(4)}_${fire.longitude.toFixed(4)}_${fire.acq_date}_${fire.acq_time}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFires.push(fire);
    }
  }

  return uniqueFires;
}

/** Minimal CSV parser tailored for FIRMS CSV output */
function parseCsv(csv: string): FirePoint[] {
  // Drop an optional UTF-8 BOM that some proxied responses attach
  const cleaned = csv.replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim());
  const latIdx = header.indexOf("latitude");
  const lngIdx = header.indexOf("longitude");
  // Brightness column: VIIRS sources report `bright_ti4`, MODIS
  // sources report `brightness`. Prefer the VIIRS-specific name to
  // match VIIRS_SNPP_NRT (the source we use today) and fall back to
  // MODIS for safety against future source swaps.
  const brightnessIdx =
    header.indexOf("bright_ti4") >= 0
      ? header.indexOf("bright_ti4")
      : header.indexOf("brightness");
  const scanIdx = header.indexOf("scan");
  const trackIdx = header.indexOf("track");
  const acqDateIdx = header.indexOf("acq_date");
  const acqTimeIdx = header.indexOf("acq_time");
  const satelliteIdx = header.indexOf("satellite");
  const confidenceIdx = header.indexOf("confidence");

  if (latIdx < 0 || lngIdx < 0) return [];

  const out: FirePoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < header.length) continue;
    const lat = Number(cols[latIdx]);
    const lng = Number(cols[lngIdx]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    out.push({
      fire_id: `FIRMS-${cols[satelliteIdx] ?? FIRMS_SOURCE}-${cols[acqDateIdx]}-${cols[acqTimeIdx]}-${i}`,
      latitude: lat,
      longitude: lng,
      satellite: cols[satelliteIdx] ?? FIRMS_SOURCE,
      confidence: normalizeConfidence(cols[confidenceIdx]),
      brightness: brightnessIdx >= 0 ? Number(cols[brightnessIdx]) || 0 : 0,
      scan_km: Number(cols[scanIdx]) || 0,
      track_km: Number(cols[trackIdx]) || 0,
      acq_date: cols[acqDateIdx] ?? "",
      acq_time: cols[acqTimeIdx] ?? "",
    });
  }

  return out;
}

/**
 * FIRMS reports confidence as single-letter codes in CSV/JSON output
 * (`h`=high, `n`=nominal, `l`=low). Older endpoints or some custom
 * datasets also surface the full words. Normalise both forms into the
 * canonical `ConfidenceLevel`; anything we don't recognise falls back
 * to `nominal` so we never silently drop a fire from the breakdown.
 */
function normalizeConfidence(raw: string | undefined): ConfidenceLevel {
  const c = (raw ?? "").trim().toLowerCase();
  if (c === "h" || c === "high") return "high";
  if (c === "l" || c === "low") return "low";
  return "nominal";
}

/**
 * FIRMS reports acquisition time as HHMM in UTC. Some upstreams or
 * partial CSV rows omit the leading digit (e.g. "134" instead of
 * "0134"), so safe-render to canonical `HH:MM` by left-padding to
 * four characters before slicing.
 *
 *   - Empty input renders `""` so a bad row doesn't print "00:00"
 *     by mistake. Callers that wrap the result with a date
 *     separator or timezone suffix are responsible for handling
 *     the empty case (e.g. dropping the ` ·  UTC` block).
 *   - Inputs longer than 4 chars are silently truncated to the
 *     first 4 digits ("12345" → "12:34"). Defensible convention
 *     if upstream FIRMS ever widens the format; flag in the PR
 *     description if you intentionally rely on this.
 */
export function formatAcqTime(acqTime: string | undefined): string {
  if (!acqTime) return "";
  // Strip non-digits before padding so upstream rows that sneak in a
  // colon separator (e.g. "12:45") don't truncate a digit on the way
  // to canonical HH:MM — `padStart` only adds when the string is
  // shorter, so without this an input like "12:45" → slice(0,4) → "12:4"
  // and the colon ends up landing one digit to the left of where it
  // was. Defensive against accidental upstream changes.
  const digits = acqTime.replace(/\D/g, "").padStart(4, "0").slice(0, 4);
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

/** Attach the province slug to each fire point using the bounding boxes */
function enrichProvince(fire: FirePoint): FirePoint {
  if (fire.province) return fire;
  const province = detectProvince(fire.latitude, fire.longitude);
  return province ? { ...fire, province: province.slug } : fire;
}
