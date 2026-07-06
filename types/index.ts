import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*                                NASA FIRMS                                  */
/* -------------------------------------------------------------------------- */

/** Confidence buckets reported by NASA FIRMS */
export type ConfidenceLevel = "low" | "nominal" | "high";

/**
 * Subset of fields returned by NASA FIRMS CSV endpoint for VIIRS_SNPP_NRT.
 * See: https://firms.modaps.eosdis.nasa.gov/api/
 */
export interface FirePoint {
  /** Unique FIRMS identifier: satellite + acquisition date+time */
  fire_id: string;
  /** Latitude in decimal degrees */
  latitude: number;
  /** Longitude in decimal degrees */
  longitude: number;
  /** Satellite source (e.g. VIIRS_SNPP_NRT) */
  satellite: string;
  /** Confidence level reported by FIRMS (low | nominal | high) */
  confidence: ConfidenceLevel;
  /** Radiative power in MW (proxy for fire intensity) */
  brightness: number;
  /** Satellite scan pixel (km) */
  scan_km: number;
  /** Satellite track pixel (km) */
  track_km: number;
  /** Acquisition datetime ISO string */
  acq_date: string;
  acq_time: string;
  /** Detected province (populated after geocoding) */
  province?: string;
}

export interface FireResponse {
  /**
   * Data source. The legacy `"mock"` value was removed when the curated
   * demo dataset was deleted; the field is kept as a single literal so
   * code that branches on it can grow to e.g. `"nasa-firms" | "cache"`
   * without breaking consumers.
   */
  source: "nasa-firms";
  count: number;
  fetchedAt: string;
  fires: FirePoint[];
  /**
   * Why the response contains no fires, when applicable:
   *
   *   - `empty`        → we reached FIRMS and it returned zero rows
   *                       for Spain in the requested window (real data).
   *   - `no-key`       → the NASA API key is not configured; the
   *                       response is intentionally empty.
   *   - `invalid-key`  → FIRMS rejected the key (401/403).
   *   - `network`      → the upstream call failed for any other reason
   *                       (DNS, TLS, timeout, non-2xx that isn't 401/403).
   *
   * Absent means we have a non-empty, real FIRMS response.
   */
  reason?: "no-key" | "invalid-key" | "network" | "empty";
}

/* -------------------------------------------------------------------------- */
/*                                Provinces                                   */
/* -------------------------------------------------------------------------- */

export interface Province {
  /** Stable slug used for filtering (e.g. "madrid") */
  slug: string;
  /** Human-readable name (e.g. "Madrid") */
  name: string;
  /** ISO 3166-2 code (e.g. "ES-M") */
  code: string;
  /** Capital coordinates */
  center: { lat: number; lng: number };
  /** [minLng, minLat, maxLng, maxLat] for spatial filtering */
  bbox: [number, number, number, number];
}

/* -------------------------------------------------------------------------- */
/*                              Subscriptions                                 */
/* -------------------------------------------------------------------------- */

export interface Subscription {
  id: string;
  user_id: string;
  province_slug: string;
  province_name: string;
  email: string;
  created_at: string;
}

export const subscriptionSchema = z.object({
  province_slug: z.string().min(1, "Selecciona una provincia"),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

/* -------------------------------------------------------------------------- */
/*                                  Alerts                                    */
/* -------------------------------------------------------------------------- */

export interface AlertRecord {
  id: string;
  subscription_id: string;
  fire_id: string;
  province_slug: string;
  sent_at: string;
  fire?: Pick<
    FirePoint,
    "latitude" | "longitude" | "confidence" | "brightness" | "acq_date"
  >;
}

/* -------------------------------------------------------------------------- */
/*                                   Auth                                     */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: z.string().email("Introduce un email válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const registerSchema = loginSchema.extend({
  fullName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre es demasiado largo")
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/* -------------------------------------------------------------------------- */
/*                            Environment helpers                             */
/* -------------------------------------------------------------------------- */

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  firmsApiKey: string;
}

export function readConfig(): AppConfig {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
    firmsApiKey: process.env.NASA_FIRMS_API_KEY?.trim() ?? "",
  };
}

export function isSupabaseConfigured(config = readConfig()): boolean {
  return Boolean(config.supabaseUrl) && Boolean(config.supabaseAnonKey);
}

export function isFirmsConfigured(config = readConfig()): boolean {
  return Boolean(config.firmsApiKey);
}
