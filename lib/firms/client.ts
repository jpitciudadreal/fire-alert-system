import { detectProvince, MOCK_FIRES } from "@/lib/data/provinces";
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
const FIRMS_REGION =
  `${SPAIN_BBOX.west},${SPAIN_BBOX.south},${SPAIN_BBOX.east},${SPAIN_BBOX.north}`;

/**
 * Cheap point-in-bbox check against `SPAIN_BBOX`. Used as a defensive
 * filter on every fire returned by FIRMS so we never display anything
 * outside Spain even if the upstream endpoint silently falls back to
 * the global `world` area for an unrecognised `area` segment.
 */
function isInSpain(lat: number, lng: number): boolean {
  return (
    lng >= SPAIN_BBOX.west &&
    lng <= SPAIN_BBOX.east &&
    lat >= SPAIN_BBOX.south &&
    lat <= SPAIN_BBOX.north
  );
}
/** How many days back to look for active fires (max 10 for NRT) */
const FIRMS_DAYS = 1;

/**
 * Fetch active wildfires for Spain from NASA FIRMS. Falls back to a
 * deterministic mock dataset when no API key is configured so the app
 * still has something visually useful to display.
 *
 * The `reason` field communicates *why* the response was mocked so the
 * home page can show an informative banner instead of silently lying about
 * the data source.
 */
export async function getFires(): Promise<FireResponse> {
  if (!isFirmsConfigured()) {
    // Single source for both `count` and `fires` so the two never
    // drift apart (e.g. if a future mock point lands outside Spain).
    const spainMock = MOCK_FIRES.map(enrichProvince).filter((f) =>
      isInSpain(f.latitude, f.longitude)
    );
    return {
      source: "mock",
      isMock: true,
      reason: "no-key",
      count: spainMock.length,
      fetchedAt: new Date().toISOString(),
      fires: spainMock,
    };
  }

  try {
    const raw = await fetchFiresFromFirms();

    // Honour the API's empty answer as real data: the upstream works
    // fine, there just aren't any fires in Spain right now. DON'T fall
    // back to mock — that would falsely display fires on the map.
    if (raw.length === 0) {
      return {
        source: "nasa-firms",
        isMock: false,
        reason: "empty",
        count: 0,
        fetchedAt: new Date().toISOString(),
        fires: [],
      };
    }

    return {
      source: "nasa-firms",
      isMock: false,
      count: raw.length,
      fetchedAt: new Date().toISOString(),
      fires: raw.map(enrichProvince),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Keep in sync with the throw site in fetchFiresFromFirms below.
    const reason: FireResponse["reason"] = /responded with (401|403)/i.test(
      message
    )
      ? "invalid-key"
      : "network";

    if (process.env.NODE_ENV !== "production") {
      // Helpful dev-only breadcrumb when searching for "why is it showing mock?"
      console.error("[firms] falling back to mock:", message);
    }

    return {
      source: "mock",
      isMock: true,
      reason,
      count: MOCK_FIRES.length,
      fetchedAt: new Date().toISOString(),
      fires: MOCK_FIRES.map(enrichProvince),
    };
  }
}

/** Performs the actual HTTP request to NASA FIRMS and parses the CSV. */
async function fetchFiresFromFirms(): Promise<FirePoint[]> {
  const key = process.env.NASA_FIRMS_API_KEY;
  if (!key) return [];

  const url =
    `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}` +
    `/${FIRMS_SOURCE}/${FIRMS_REGION}/${FIRMS_DAYS}`;

  const res = await fetch(url, {
    // Re-fetch at most every hour when this route is called
    next: { revalidate: 60 * 60 },
    headers: { Accept: "text/csv" },
  });

  if (!res.ok) {
    throw new Error(`NASA FIRMS responded with ${res.status}`);
  }

  const csv = await res.text();
  // Defensive in-depth filter: trim anything outside Spain even if the
  // upstream FIRMS endpoint silently returned the world for the
  // `area` segment. Same bbox as the URL so this can't accidentally
  // hide a legitimate Spanish fire.
  return parseCsv(csv).filter((f) => isInSpain(f.latitude, f.longitude));
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
      brightness: brightnessIdx >= 0 ? (Number(cols[brightnessIdx]) || 0) : 0,
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

/** Attach the province slug to each fire point using the bounding boxes */
function enrichProvince(fire: FirePoint): FirePoint {
  if (fire.province) return fire;
  const province = detectProvince(fire.latitude, fire.longitude);
  return province ? { ...fire, province: province.slug } : fire;
}
