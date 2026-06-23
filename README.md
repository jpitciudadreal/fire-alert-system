# 🔥 Fire Alert — Wildfire tracking for Spain

Real-time map of active wildfires in Spain powered by **NASA FIRMS** and personalised email alerts backed by **Supabase**. Built with the Next.js App Router, React 19, Tailwind v4 and react-leaflet 5.

> Works **out-of-the-box in demo mode**: even without Supabase or a FIRMS API key, the app boots and shows a deterministic mock dataset against an interactive map.

---

## ✨ Features

- 🗺️ **Interactive dark map** with live fire markers (confidence-coded colours + tooltips + popups)
- 📊 **Live stats**: counts by confidence level, last-fetch timestamp and data source
- 🔔 **Province subscriptions** — pick provinces and receive email alerts when new fires appear
- 🔐 **Email/password auth** with Supabase (RLS-protected per user)
- 🪪 **Demo mode** — gracefully degrades when Supabase / NASA FIRMS env vars are missing
- 📱 **Responsive & accessible** — keyboard nav, ARIA labels, dark/light theme tokens

---

## 🚀 Quick start

```bash
# 1. Install
npm install

# 2. (optional) Configure env vars – copy first
cp .env.local.example .env.local
# then fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NASA_FIRMS_API_KEY

# 3. Run the dev server
npm run dev

# 4. Open http://localhost:3000
```

> **Without `.env.local`** the app still works — the live map shows the curated `MOCK_FIRES` dataset and the dashboard presents a friendly configuration prompt.

---

## 🧱 Stack

| Layer        | Tech                                                |
|--------------|-----------------------------------------------------|
| Framework    | Next.js 16 (App Router, React Server Components)   |
| Language     | TypeScript 5 (strict)                              |
| Styling      | Tailwind CSS v4 (`@theme inline` tokens)           |
| Maps         | Leaflet 1.9 + react-leaflet 5 + CartoDB Dark tiles |
| Forms        | react-hook-form 7 + zod 4 (`zodResolver`)          |
| Auth + DB    | Supabase (`@supabase/ssr` 0.12) with RLS           |
| External API | NASA FIRMS (`/api/area/csv` CSV endpoint)          |

---

## 📁 Project structure

```
.
├── app/
│   ├── (auth)/          # /login & /register share a centred card layout
│   ├── api/
│   │   ├── auth/signout/route.ts
│   │   └── fires/route.ts            # Proxies NASA FIRMS, falls back to mock
│   ├── dashboard/page.tsx           # Server component, gated by Supabase auth
│   ├── layout.tsx
│   └── page.tsx                     # Landing with map + stats panel
├── components/
│   ├── alert/                       # Auth forms, dashboard widgets
│   ├── dashboard/                   # SubscriptionManager, forms, list, sign-out
│   ├── map/                         # FireMap (client) + MapShell (dynamic ssr:false)
│   └── ui/                          # Button, Card, Field/Input/Select, Badge
├── lib/
│   ├── data/provinces.ts            # 32 Spanish provinces + bounding boxes + mock fires
│   ├── firms/client.ts              # NASA FIRMS client w/ deterministic mock fallback
│   └── supabase/
│       ├── client.ts                # Browser client (real OR mock)
│       ├── server.ts                # Server client (real OR mock)
│       └── middleware.ts            # Session refresher
├── supabase/
│   ├── schema.sql                   # Tables, indexes, RLS policies
│   ├── cron.sql                     # pg_cron schedule for the alert Edge Function
│   └── functions/check-fires/       # Deno Edge Function: FIRMS + subscriptions + Resend
├── types/index.ts                   # Shared types + Zod schemas
├── middleware.ts                    # Refreshes Supabase session per request
└── .env.local.example
```

---

## 🔐 Configuration

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
NASA_FIRMS_API_KEY=""
```

| Variable                       | Required | Scope          | Notes                                            |
|--------------------------------|----------|----------------|--------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`     | optional | client+server  | Gracefully handled when missing (demo mode)      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| optional | client+server  | Same                                             |
| `NASA_FIRMS_API_KEY`           | optional | server only    | Free key via https://firms.modaps.eosdis.nasa.gov/api/ |

### NASA FIRMS API

The default request is:

```
GET https://firms.modaps.eosdis.nasa.gov/api/area/csv/<KEY>/VIIRS_SNPP_NRT/<BBOX>/1
```

`<BBOX>` is hard-coded to `-18,27,5,44` (W=S=N=44), which covers mainland Spain + Balearic + Canary islands end-to-end (Canarias south at ~27.6° N, Estaca de Bares north at ~43.8° N). The response is cached by Next.js for one hour when the upstream call succeeds.

### Supabase schema

Execute [`supabase/schema.sql`](./supabase/schema.sql) in the SQL editor of your Supabase project to create:

- `public.subscriptions` (user_id, province_slug, province_name, email, unique per user+province)
- `public.alert_history` (subscription_id, fire_id, fire_lat/lng/confidence/brightness, province_slug, sent_at, unique per subscription+fire)
- Row Level Security policies so users only see their own data
- (the cron schedule lives in [`supabase/cron.sql`](./supabase/cron.sql), run separately)

### 📨 Email alerts — Edge Function + Resend

Active subscribers receive digest emails whenever new fires appear in their province. The flow:

1. `pg_cron` (`*/15 * * * *`) calls the **`check-fires` Edge Function** via `pg_net` every 15 minutes.
2. The function fetches FIRMS data, filters to Spain, attaches each fire to its province bbox, looks up matching subscriptions.
3. It dedupes against `alert_history` (unique constraint on `(subscription_id, fire_id)`), sends a single digest email per (subscription, run) via **Resend**, then records each delivery.

#### One-time setup

```sh
# 1. Install the Supabase CLI (https://supabase.com/docs/guides/cli)
brew install supabase/tap/supabase           # macOS
scoop install supabase                       # Windows

# 2. Sign up at https://resend.com and grab an API key (free tier covers 100/day)

# 3. Deploy the Edge Function (default keeps Supabase's JWT-gateway
#    verification on top of our handler's service-role bearer check;
#    both layers trust the SUPABASE_SERVICE_ROLE_KEY)
supabase functions deploy check-fires

# 4. Configure Edge Function secrets
supabase secrets set \
  FIRMS_API_KEY=your-nasa-key \
  RESEND_API_KEY=re_xxx \
  RESEND_FROM="Fire Alert <alerts@yourdomain>" \
  FIRM_ALERTS_BASE_URL=https://fire-alerts.example.com
# (Add `app.functions_secret=<random>` too — re-used by cron.sql below.)

# 5. Enable extensions + schedule the cron (one-shot in SQL editor)
create extension if not exists pg_cron;
create extension if not exists pg_net;
# Then run supabase/cron.sql (replace <project-ref> with your subdomain).
```

#### Manual trigger (testing)

```sh
curl -X POST \
  "https://<project-ref>.supabase.co/functions/v1/check-fires" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
# Returns a JSON summary like:
# {"ok":true,"fetched_fires":82,"emails_sent":3,"emails_skipped_idempotent":12,...}
```

#### Idempotency

The `(subscription_id, fire_id)` unique index on `alert_history` is the only source of truth — `INSERT` is filtered against existing rows before each send, so a fire is never emailed twice to the same subscriber. Restart the function mid-run? Safe. Replay a cron tick? Safe.

#### Required Edge Function secrets

| Secret                  | Where                                    | Notes                                              |
|-------------------------|------------------------------------------|----------------------------------------------------|
| `FIRMS_API_KEY`         | `supabase secrets set`                   | Same key as the Next.js app reads from `.env.local` |
| `RESEND_API_KEY`        | `supabase secrets set`                   | From resend.com                                    |
| `RESEND_FROM`           | `supabase secrets set`                   | Verified sender identity                           |
| `FIRM_ALERTS_BASE_URL`  | `supabase secrets set` (optional)        | Defaults to `http://localhost:3000` for dev        |
| `app.functions_secret`  | `supabase secrets set`                   | Random 32+ char string; used in `cron.sql` Authorization header |
| `SUPABASE_URL`          | auto-injected                            | Per-function env                                   |
| `SUPABASE_SERVICE_ROLE_KEY` | auto-injected                         | Bypasses RLS — endpoint auth-gated manually       |

---

## 🧭 Routing summary

| Path             | Type            | Purpose                                          |
|------------------|-----------------|--------------------------------------------------|
| `/`              | Server          | Live map + stats + recent fires                  |
| `/login`         | Client          | Supabase email/password sign-in                  |
| `/register`      | Client          | Supabase email/password sign-up                  |
| `/dashboard`     | Server (auth)   | Subscription CRUD (RLS-protected)                |
| `/api/fires`     | Route handler   | Proxies NASA FIRMS + cache                       |
| `/api/auth/signout` | Route handler | Form-target sign-out                             |

---

## 🧪 Development

```bash
npm run dev    # next dev
npm run lint   # eslint
npm run build  # production build
npm start      # next start (after build)
```

---

## 🚧 Roadmap / TODO

- [x] Resend integration + Supabase Edge Function `check-fires`
- [x] pg_cron schedule every 15 min (see `supabase/cron.sql`)
- [ ] Alert history panel in `/dashboard` (currently a `Pronto` banner — backed by `alert_history`)
- [ ] Manual "Run now" button in dashboard (server-side proxy so the service role stays server-only)
- [ ] Multi-language (i18n) — currently ES-only strings
- [ ] Realtime updates via Supabase channels
- [ ] Province-level heat trend chart

---

## ⚖️ Credits & licensing

- Fire data © **NASA FIRMS** (public domain)
- Map tiles © **OpenStreetMap** contributors & **CARTO**
- Application source: MIT (do whatever you'd like, attribution appreciated)
