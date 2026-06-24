// =====================================================================
// supabase/functions/check-fires/index.ts
//
// Triggered by Supabase pg_cron (or manual `curl` with the service-role
// bearer) every N minutes. Detects new wildfires in Spain, matches them
// to active subscriptions, sends a digest email per (subscription,
// run) via Resend, and records each delivery in `alert_history` for
// idempotency.
//
// Self-contained by design:
//   - Province bbox data is duplicated from lib/data/provinces.ts.
//   - FIRMS CSV parsing (incl. confidence normalisation and bright_ti4
//     fallback) is reimplemented here in Deno instead of pulling from
//     lib/firms/client.ts — Node app and Deno Edge Function runtimes
//     don't share a module graph.
//
// Required secrets (set with `supabase secrets set`):
//   FIRMS_API_KEY          — NASA FIRMS map key
//   RESEND_API_KEY         — Resend API key
//   RESEND_FROM            — Sender identity, e.g. "Fire Alert <noreply@firealerts.app>"
//   FIRM_ALERTS_BASE_URL   — Public app URL for the dashboard link in
//                            emails. Defaults to http://localhost:3000.
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase.
// =====================================================================

const FIRMS_SOURCE = "VIIRS_SNPP_NRT";
const FIRMS_DAYS = "1";

/**
 * Spain bbox (W, S, E, N). Kept in lockstep with `SPAIN_BBOX` in
 * `lib/firms/client.ts` — change one, change both.
 */
const SPAIN_BBOX = { west: -18, south: 27, east: 5, north: 44 } as const;
const FIRMS_REGION =
  `${SPAIN_BBOX.west},${SPAIN_BBOX.south},${SPAIN_BBOX.east},${SPAIN_BBOX.north}`;

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

type Confidence = "low" | "nominal" | "high";

interface ProvinceDefinition {
  readonly slug: string;
  readonly bbox: readonly [number, number, number, number]; // [W, S, E, N]
}

interface Fire {
  fire_id: string;
  latitude: number;
  longitude: number;
  confidence: Confidence;
  brightness: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  /** Province slug when inside a known bbox, undefined otherwise. */
  province?: string;
}

interface SubscriptionRow {
  id: string;
  province_slug: string;
  province_name: string;
  email: string;
}

interface AlertRunSummary {
  ok: boolean;
  /** True when the run fired at least one email AND also hit errors. */
  partial: boolean;
  fetched_fires: number;
  fires_in_spain: number;
  fires_with_province: number;
  candidate_subscriptions: number;
  emails_sent: number;
  emails_skipped_idempotent: number;
  errors: { subscription?: string; stage: string; message: string }[];
  ran_at: string;
  duration_ms: number;
}

/** Row shape for `POST /rest/v1/alert_history`. */
interface AlertHistoryRow {
  subscription_id: string;
  fire_id: string;
  fire_lat: number;
  fire_lng: number;
  fire_confidence: Confidence;
  fire_brightness: number;
  province_slug: string;
  sent_at: string;
}

/* -------------------------------------------------------------------------- */
/*                              Provinces                                     */
/* -------------------------------------------------------------------------- */

/**
 * Mirror of lib/data/provinces.ts bboxes (subset of 31 provinces).
 * If you ever add/remove a province to the Next.js app, change it here
 * as well — strict equality is what makes alert_subscription ↔ fire_province
 * joins work.
 */
const PROVINCES: readonly ProvinceDefinition[] = [
  { slug: "madrid", bbox: [-4.65, 39.85, -3.05, 41.15] },
  { slug: "toledo", bbox: [-5.45, 39.25, -3.05, 40.45] },
  { slug: "ciudad-real", bbox: [-4.95, 38.35, -2.95, 39.75] },
  { slug: "caceres", bbox: [-7.55, 38.95, -5.05, 40.65] },
  { slug: "badajoz", bbox: [-7.45, 37.95, -5.75, 39.65] },
  { slug: "huelva", bbox: [-7.55, 36.95, -6.05, 38.25] },
  { slug: "sevilla", bbox: [-6.55, 36.95, -5.05, 38.05] },
  { slug: "cordoba", bbox: [-5.55, 37.15, -4.05, 38.45] },
  { slug: "jaen", bbox: [-4.45, 37.05, -2.85, 38.65] },
  { slug: "granada", bbox: [-4.45, 36.65, -2.55, 38.05] },
  { slug: "malaga", bbox: [-5.65, 36.25, -3.65, 37.45] },
  { slug: "cadiz", bbox: [-6.55, 35.95, -5.05, 37.05] },
  { slug: "valladolid", bbox: [-5.65, 40.85, -3.85, 42.35] },
  { slug: "zamora", bbox: [-7.05, 41.05, -5.45, 42.35] },
  { slug: "leon", bbox: [-7.35, 41.75, -4.85, 43.15] },
  { slug: "lugo", bbox: [-7.95, 42.55, -6.55, 43.85] },
  { slug: "ourense", bbox: [-8.35, 41.85, -6.85, 42.85] },
  { slug: "pontevedra", bbox: [-8.95, 41.85, -8.05, 42.85] },
  { slug: "valencia", bbox: [-1.55, 38.55, 0.55, 40.15] },
  { slug: "castellon", bbox: [-0.85, 39.55, 0.65, 40.85] },
  { slug: "alicante", bbox: [-1.15, 37.75, 0.45, 38.95] },
  { slug: "murcia", bbox: [-2.25, 37.35, -0.65, 38.85] },
  { slug: "almeria", bbox: [-3.25, 36.25, -1.45, 37.85] },
  { slug: "zaragoza", bbox: [-2.15, 40.85, 0.45, 42.15] },
  { slug: "huesca", bbox: [-1.15, 41.45, 0.85, 42.95] },
  { slug: "lleida", bbox: [-1.45, 41.25, 1.85, 42.85] },
  { slug: "girona", bbox: [1.65, 41.55, 3.35, 42.65] },
  { slug: "barcelona", bbox: [1.35, 41.15, 2.75, 41.85] },
  { slug: "tarragona", bbox: [0.15, 40.45, 1.85, 41.55] },
  { slug: "illes-balears", bbox: [1.15, 38.55, 4.45, 40.45] },
  { slug: "las-palmas", bbox: [-15.95, 27.65, -13.45, 29.45] },
  { slug: "santa-cruz-de-tenerife", bbox: [-18.35, 27.65, -15.85, 28.95] },
];

/* -------------------------------------------------------------------------- */
/*                                 Helpers                                    */
/* -------------------------------------------------------------------------- */

function isInSpain(lat: number, lng: number): boolean {
  return (
    lng >= SPAIN_BBOX.west &&
    lng <= SPAIN_BBOX.east &&
    lat >= SPAIN_BBOX.south &&
    lat <= SPAIN_BBOX.north
  );
}

/**
 * Escape user-controlled or env-controlled strings before they enter
 * HTML in the email template. Covers the realistic injection surface —
 * numeric fields (`fire.latitude.toFixed(3)` etc.) are safe by construction.
 * Also applied defensively to NARROW alphanumeric FIRMS fields like
 * `acq_date`/`acq_time` even though NASA controls their charset.
 */
function escapeHtml(s: string | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Email subjects are RFC 5322 plain text — NOT HTML. So no entity
 * encoding here: `&lt;` would render literally in the subject line.
 * RFC 5322 only allows printable ASCII + folding whitespace, so we
 * collapse the entire C0 ASCII control range (0x00–0x1F) plus DEL
 * (0x7F) to a single space, strip `<`/`>` (which violate MIME folding),
 * and keep unicode (ñ, accents, emoji) intact.
 */
function sanitizeSubject(s: string | undefined): string {
  return (s ?? "")
    .replace(/[\x00-\x1f\x7f]+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

/** FIRMS reports confidence as `h`/`n`/`l`; older/custom sources as full words. */
function normalizeConfidence(raw: string | undefined): Confidence {
  const c = (raw ?? "").trim().toLowerCase();
  if (c === "h" || c === "high") return "high";
  if (c === "l" || c === "low") return "low";
  return "nominal";
}

function detectProvince(lat: number, lng: number): string | undefined {
  for (const p of PROVINCES) {
    const [minLng, minLat, maxLng, maxLat] = p.bbox;
    if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
      return p.slug;
    }
  }
  return undefined;
}

/**
 * Fire ID format kept identical to lib/firms/client.ts so the unique
 * index (subscription_id, fire_id) deduplicates the same fire across
 * both code paths.
 */
function buildFireId(
  satellite: string,
  acqDate: string,
  acqTime: string,
  rowIdx: number
): string {
  return `FIRMS-${satellite}-${acqDate}-${acqTime}-${rowIdx}`;
}

/* -------------------------------------------------------------------------- */
/*                              FIRMS fetching                                */
/* -------------------------------------------------------------------------- */

async function fetchFiresFromFirms(): Promise<Fire[]> {
  const key = Deno.env.get("FIRMS_API_KEY");
  if (!key) throw new Error("FIRMS_API_KEY secret not configured");

  const url =
    `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}` +
    `/${FIRMS_SOURCE}/${FIRMS_REGION}/${FIRMS_DAYS}`;

  const res = await fetch(url, { headers: { Accept: "text/csv" } });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`FIRMS responded with ${res.status}: ${detail.slice(0, 200)}`);
  }

  const csv = await res.text();
  return parseFirmsCsv(csv);
}

function parseFirmsCsv(csv: string): Fire[] {
  const cleaned = csv.replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim());
  const latIdx = header.indexOf("latitude");
  const lngIdx = header.indexOf("longitude");
  // Brightness: VIIRS uses `bright_ti4`, MODIS uses `brightness`.
  const vIIRSBrightnessIdx = header.indexOf("bright_ti4");
  const brightnessIdx =
    vIIRSBrightnessIdx >= 0 ? vIIRSBrightnessIdx : header.indexOf("brightness");
  const acqDateIdx = header.indexOf("acq_date");
  const acqTimeIdx = header.indexOf("acq_time");
  const satelliteIdx = header.indexOf("satellite");
  const confidenceIdx = header.indexOf("confidence");

  if (latIdx < 0 || lngIdx < 0) return [];

  const out: Fire[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < header.length) continue;
    const lat = Number(cols[latIdx]);
    const lng = Number(cols[lngIdx]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!isInSpain(lat, lng)) continue;

    const satellite = cols[satelliteIdx] ?? FIRMS_SOURCE;
    const acq_date = cols[acqDateIdx] ?? "";
    const acq_time = cols[acqTimeIdx] ?? "";
    const brightness =
      brightnessIdx >= 0 ? Number(cols[brightnessIdx]) || 0 : 0;

    out.push({
      fire_id: buildFireId(satellite, acq_date, acq_time, i),
      latitude: lat,
      longitude: lng,
      confidence: normalizeConfidence(cols[confidenceIdx]),
      brightness,
      acq_date,
      acq_time,
      satellite,
      province: detectProvince(lat, lng),
    });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/*                            Supabase REST helpers                           */
/* -------------------------------------------------------------------------- */

function supabaseConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not available");
  }
  return { url, key };
}

const REST_HEADERS = (key: string) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
});

async function fetchSubscribersByProvince(
  slugs: string[]
): Promise<SubscriptionRow[]> {
  if (slugs.length === 0) return [];
  const { url, key } = supabaseConfig();
  const inList = slugs.map(encodeURIComponent).join(",");
  const u =
    `${url}/rest/v1/subscriptions` +
    `?select=id,province_slug,province_name,email` +
    `&province_slug=in.(${inList})`;

  const res = await fetch(u, { headers: REST_HEADERS(key) });
  if (!res.ok) {
    throw new Error(`subscriptions read ${res.status}`);
  }
  const rows = (await res.json()) as SubscriptionRow[];
  return Array.isArray(rows) ? rows : [];
}

async function recordAlerts(
  rows: AlertHistoryRow[]
): Promise<AlertHistoryRow[]> {
  if (rows.length === 0) return [];
  const { url, key } = supabaseConfig();
  // `resolution=ignore-duplicates` + `return=representation` make this
  // the single source of truth for "what's new":
  //   - `ignore-duplicates` silently drops rows that conflict with the
  //     unique `(subscription_id, fire_id)` index
  //   - `return=representation` makes the POST response body contain
  //     ONLY the rows that were actually inserted
  // Combined, the response body is the *exact* set the caller should
  // email — race-safe even if two runs (cron-tick collision, manual
  // retry, cold-start overlap) hit the same row at the same time.
  const res = await fetch(`${url}/rest/v1/alert_history`, {
    method: "POST",
    headers: {
      ...REST_HEADERS(key),
      Prefer: "resolution=ignore-duplicates, return=representation",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`alert_history insert ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = await res.json();
  return Array.isArray(body) ? (body as AlertHistoryRow[]) : [];
}

/* -------------------------------------------------------------------------- */
/*                              Email rendering                                */
/* -------------------------------------------------------------------------- */

const CONFIDENCE_TONE = {
  high: { label: "ALTA", color: "#dc2626", bg: "#7f1d1d" },
  nominal: { label: "Nominal", color: "#f97316", bg: "#7c2d12" },
  low: { label: "Baja", color: "#facc15", bg: "#713f12" },
} as const;

function renderFireRow(fire: Fire): string {
  const tone = CONFIDENCE_TONE[fire.confidence];
  // TODO: consolidate with `formatAcqTime` in lib/firms/client.ts.
  // Deno Edge Functions can't import from the Next.js module graph
  // (see the file header) so the helper is inlined here. If the two
  // implementations ever drift, the email digest will render
  // differently from the React UI — keep the semantics in sync.
  const paddedTime = (fire.acq_time ?? "")
    .replace(/\D/g, "")
    .padStart(4, "0")
    .slice(0, 4);
  const hh = paddedTime.slice(0, 2);
  const mm = paddedTime.slice(2, 4);
  return `
    <tr>
      <td style="padding: 14px 16px; border-top: 1px solid #27272a;">
        <span style="
          display:inline-block;
          padding: 2px 8px;
          background: ${tone.bg};
          color: ${tone.color};
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        ">${tone.label}</span>
      </td>
      <td style="padding: 14px 16px; border-top: 1px solid #27272a; font-family: ui-monospace, monospace; font-size: 13px;">
        ${fire.latitude.toFixed(3)}°, ${fire.longitude.toFixed(3)}°
      </td>
      <td style="padding: 14px 16px; border-top: 1px solid #27272a; font-size: 13px;">
        ${fire.brightness.toFixed(1)} K
      </td>
      <td style="padding: 14px 16px; border-top: 1px solid #27272a; font-size: 13px; color: #a1a1aa;">
        ${fire.acq_date} · ${hh}:${mm} UTC
      </td>
    </tr>`;
}

/**
 * Validate that a URL is safe to put inside an `href=""` attribute.
 * We deliberately do NOT pass URLs through `escapeHtml` because that
 * would turn `&` into `&amp;` and break query strings — URLs have
 * their own canonical escape (`encodeURI`). Instead we:
 *
 *   1. Whitelist the protocol (`http`/`https`) to block
 *      `javascript:` / `data:` / `vbscript:` injection.
 *   2. Strip any path, query, or fragment so the caller can safely
 *      append `/dashboard` and get a canonical URL shape. The admin
 *      contract is that `FIRM_ALERTS_BASE_URL` is the origin only
 *      (e.g. `https://app.example.com`), nothing more.
 *
 * Falls back to a placeholder if validation fails.
 */
function safeHref(url: string | undefined): string {
  const u = (url ?? "").trim();
  if (!/^https?:\/\//i.test(u)) return "https://firealerts.app";
  // Drop everything past the host: trailing slash, query, fragment.
  return u.replace(/[/?#].*$/, "").replace(/\/+$/, "") || "https://firealerts.app";
}

function renderEmail(
  fires: Fire[],
  provinceName: string,
  dashboardUrl: string
): { subject: string; html: string } {
  const count = fires.length;
  // Subject is plain text (RFC 5322) → sanitize, don't HTML-escape.
  // Body is HTML → escape entities on the user-controlled name, and
  // validate the URL's protocol separately (URLs must not be HTML-
  // escaped because they have their own canonical escape rules).
  const subjectProvinceName = sanitizeSubject(provinceName);
  const safeProvinceName = escapeHtml(provinceName);
  const hrefDashboard = safeHref(dashboardUrl);
  const subject =
    count === 1
      ? `🔥 Nuevo foco activo en ${subjectProvinceName}`
      : `🔥 ${count} nuevos focos activos en ${subjectProvinceName}`;

  const rowsHtml = fires.map(renderFireRow).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background:#0a0a0b; color:#ededed; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="
          background:#18181b;
          border:1px solid #27272a;
          border-radius:16px;
          padding:32px;
        ">
          <tr>
            <td>
              <h1 style="margin:0 0 8px 0; color:#fb923c; font-size:20px;">🔥 Fire Alert</h1>
              <p style="margin:0 0 24px 0; color:#d4d4d8; font-size:14px; line-height:1.5;">
                Hemos detectado <strong style="color:#fafafa;">${count}</strong>
                ${count === 1 ? "nuevo foco activo" : "nuevos focos activos"}
                en <strong style="color:#fafafa;">${safeProvinceName}</strong>.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="text-align:left;">
                    <th style="padding:0 16px 8px 16px; font-size:11px; font-weight:600; color:#71717a; letter-spacing:0.05em; text-transform:uppercase;">Confianza</th>
                    <th style="padding:0 16px 8px 16px; font-size:11px; font-weight:600; color:#71717a; letter-spacing:0.05em; text-transform:uppercase;">Coordenadas</th>
                    <th style="padding:0 16px 8px 16px; font-size:11px; font-weight:600; color:#71717a; letter-spacing:0.05em; text-transform:uppercase;">Brillo</th>
                    <th style="padding:0 16px 8px 16px; font-size:11px; font-weight:600; color:#71717a; letter-spacing:0.05em; text-transform:uppercase;">Adquisición</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>

              <hr style="border:none; border-top:1px solid #27272a; margin:24px 0;" />

              <p style="margin:0; color:#71717a; font-size:12px; line-height:1.5;">
                Gestiona tus suscripciones o cancela esta notificación desde tu
                <a href="${hrefDashboard}/dashboard" style="color:#fb923c; text-decoration:none;">dashboard</a>.
                Datos: NASA FIRMS (VIIRS_SNPP_NRT).
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

/* -------------------------------------------------------------------------- */
/*                              Resend delivery                               */
/* -------------------------------------------------------------------------- */

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<string> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM");
  if (!apiKey) throw new Error("RESEND_API_KEY secret not configured");
  if (!from) throw new Error("RESEND_FROM secret not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as { id?: string };
  return body.id ?? "(no id)";
}

/* -------------------------------------------------------------------------- */
/*                                  Handler                                   */
/* -------------------------------------------------------------------------- */

Deno.serve(async (req: Request) => {
  const startedAt = Date.now();
  const summary: AlertRunSummary = {
    ok: false,
    partial: false,
    fetched_fires: 0,
    fires_in_spain: 0,
    fires_with_province: 0,
    candidate_subscriptions: 0,
    emails_sent: 0,
    emails_skipped_idempotent: 0,
    errors: [],
    ran_at: new Date().toISOString(),
    duration_ms: 0,
  };

  // ---- Auth: require service-role bearer ----
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`;
  if (req.headers.get("Authorization") !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // 1) Fetch and enrich fires
    const allFires = await fetchFiresFromFirms();
    summary.fetched_fires = allFires.length;
    summary.fires_in_spain = allFires.length; // already filtered by isInSpain

    const firesWithProvince = allFires.filter((f) => !!f.province);
    summary.fires_with_province = firesWithProvince.length;

    if (firesWithProvince.length === 0) {
      // No fires → nothing to do. Mark ok=true so health checks don't
      // flag a quiet period as an incident.
      summary.ok = true;
      summary.duration_ms = Date.now() - startedAt;
      return jsonResponse(summary);
    }

    // 2) Subscribers whose province matches any detected fire
    const provinceSlugs = Array.from(
      new Set(firesWithProvince.map((f) => f.province as string))
    );
    const subscriptions = await fetchSubscribersByProvince(provinceSlugs);
    summary.candidate_subscriptions = subscriptions.length;

    // 3) Per subscription:
    //    - Build candidate rows from the in-memory Fire list.
    //    - INSERT them with `ignore-duplicates + return=representation`
    //      so the response body tells us exactly which rows were new.
    //    - Empty response → all candidates were already alerted; skip.
    //    - Otherwise send a single digest email listing only the
    //      newly-inserted rows.
    //
    //    This makes the dedup contract atomic: two runs racing on the
    //    same row will both attempt the INSERT, PostgREST will hand
    //    rows out to exactly one of them, and only the winner emails.
    for (const sub of subscriptions) {
      const candidateFires = firesWithProvince.filter(
        (f) => f.province === sub.province_slug
      );
      if (candidateFires.length === 0) continue;

      const sentAt = new Date().toISOString();
      const rowsToTry: AlertHistoryRow[] = candidateFires.map((f) => ({
        subscription_id: sub.id,
        fire_id: f.fire_id,
        fire_lat: f.latitude,
        fire_lng: f.longitude,
        fire_confidence: f.confidence,
        fire_brightness: f.brightness,
        province_slug: sub.province_slug,
        sent_at: sentAt,
      }));

      try {
        const inserted = await recordAlerts(rowsToTry);
        if (inserted.length === 0) {
          summary.emails_skipped_idempotent += 1;
          continue;
        }

        // Map the freshly-inserted rows back to Fire objects so we use
        // exactly the data the DB stamped (defends against any drift
        // between the in-memory list and what was just persisted).
        const insertedFireIds = new Set(inserted.map((r) => r.fire_id));
        const newFires = candidateFires.filter((f) =>
          insertedFireIds.has(f.fire_id)
        );

        const baseUrl =
          Deno.env.get("FIRM_ALERTS_BASE_URL") ?? "http://localhost:3000";
        const { subject, html } = renderEmail(
          newFires,
          sub.province_name,
          baseUrl
        );
        await sendEmail(sub.email, subject, html);

        summary.emails_sent += 1;
        console.log(
          `[check-fires] sent digest to ${sub.email}: ${newFires.length} fire(s) in ${sub.province_slug}`
        );
      } catch (err) {
        summary.errors.push({
          subscription: sub.id,
          stage: "send_or_record",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    summary.ok = summary.errors.length === 0;
    // Partial success flag: at least one email went out but some
    // subscriptions also errored. Useful for monitoring without
    // collapsing the run into a binary `ok=false` (and masking
    // the fact that most users *did* get their alerts).
    summary.partial =
      summary.emails_sent > 0 && summary.errors.length > 0;
  } catch (err) {
    summary.ok = false;
    summary.errors.push({
      stage: "top_level",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  summary.duration_ms = Date.now() - startedAt;
  return jsonResponse(summary);
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
