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

> **Without `NASA_FIRMS_API_KEY`** the map shows an empty dataset with an explicit “configura tu API key” footer — the app never serves fake data. A real `getFires()` round-trip with an empty answer (`reason: "empty"`) is also rendered as such, so the page always reflects what's actually in FIRMS at fetch time.

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
| Email        | Gmail SMTP (port 465, App Password)                |

---

## 📁 Project structure

```
.
├── app/
│   ├── (auth)/          # /login & /register share a centred card layout
│   ├── api/
│   │   ├── auth/signout/route.ts
│   │   ├── check-fires/run/route.ts # Auth proxy → triggers check-fires Edge Function
│   │   └── fires/route.ts           # Proxies NASA FIRMS, falls back to mock
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
│   └── functions/check-fires/       # Deno Edge Function: FIRMS + subscriptions + Gmail SMTP
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
CRON_SECRET=""             # SAME value as `supabase secrets set CRON_SECRET`
```

| Variable                       | Required | Scope          | Notes                                            |
|--------------------------------|----------|----------------|--------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`     | optional | client+server  | Gracefully handled when missing (demo mode)      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| optional | client+server  | Same                                             |
| `NASA_FIRMS_API_KEY`           | optional | server only    | Free key via https://firms.modaps.eosdis.nasa.gov/api/ |
| `CRON_SECRET`                  | optional | server only    | Must equal the Edge Function secret. Enables the "Ejecutar detector" button in `/dashboard` (see `/api/check-fires/run`). |

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

### 📨 Email alerts — Edge Function + Gmail SMTP (App Password)

Active subscribers receive digest emails whenever new fires appear in their province. The flow:

1. `pg_cron` (`*/15 * * * *`) calls the **`check-fires` Edge Function** via `pg_net` every 15 minutes.
2. The function fetches FIRMS data, filters to Spain, attaches each fire to its province bbox, looks up matching subscriptions.
3. It dedupes against `alert_history` (unique constraint on `(subscription_id, fire_id)`), sends a single digest email per (subscription, run) through **Gmail SMTP** (implicit TLS on port 465, no third-party email service, no OAuth dance), then records each delivery.

#### One-time Gmail App Password setup

You send email *out of your own Gmail account* — the SMTP submission service replaces the earlier OAuth flow with a single 16-character App Password. There is no consent screen, no test-user list, no domain verification.

**Prerequisites (one Gmail account):**
- 2-Step Verification **enabled** — required before any App Password can be issued.

**Steps:**
1. Generate the App Password
   - Open <https://myaccount.google.com/apppasswords> while signed in to the Gmail account that will send alerts.
   - Click **Create**, give it any name (e.g. *Fire Alert Cron*), pick app = **Mail**.
   - Copy the 16-character password — Google only shows it once.
2. Edge Function secrets
   ```sh
   supabase functions deploy check-fires

   supabase secrets set \
     CRON_SECRET=<strong-random-string> \
     FIRMS_API_KEY=your-nasa-key \
     GMAIL_FROM='Fire Alert <your-account@gmail.com>' \
     GMAIL_APP_PASSWORD=abcd efgh ijkl mnop \
     FIRM_ALERTS_BASE_URL=https://fire-alerts.example.com
   ```
   `GMAIL_FROM` MUST be an address owned by the Gmail account that issued the App Password — Gmail rejects mismatches on the SMTP envelope.
3. Enable extensions + schedule the cron (one-shot in the Supabase SQL editor):
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   -- Mirror CRON_SECRET in Vault so pg_cron can read it via
   -- vault.decrypted_secrets (see supabase/cron.sql for the full script).
   ```
   Then run [`supabase/cron.sql`](./supabase/cron.sql) (replace `<project-ref>` with your Supabase subdomain).

> ⚠️ If the sending Gmail address ever changes, regenerate the App Password and update `GMAIL_APP_PASSWORD` — the old one stops working for the new account.

#### Manual trigger (testing)

There are two ways to run `check-fires` outside the cron schedule:

1. **From the dashboard.** Once you sign in, the `/dashboard` page shows a **"🔥 Ejecutar check-fires"** button. Hitting it invokes `POST /api/check-fires/run`, which authenticates you as a Supabase user, then calls the Edge Function with the server-side `CRON_SECRET` (the secret never touches the browser bundle). The resulting `AlertRunSummary` is rendered in the same card with a status badge (`OK` / `Parcial` / `Con errores`), a grid of stats (fetched / in Spain / with province / emails sent), and the `run_id` so you can correlate with Edge Function logs.
2. **Direct `curl` against the function URL.** Use the same `CRON_SECRET` value (NOT the service-role key, the function strictly checks `Authorization: Bearer <CRON_SECRET>`):

   ```sh
   curl -X POST \
     "https://<project-ref>.supabase.co/functions/v1/check-fires" \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{}'
   # Returns a JSON summary like:
   # {"ok":true,"fetched_fires":82,"emails_sent":3,"emails_skipped_idempotent":12,...}
   ```

The flow is idempotent — re-running the detector within minutes will NOT re-email subscribers that already received a digest for the same fire, thanks to the `(subscription_id, fire_id)` unique index on `alert_history`.

#### Idempotency

The `(subscription_id, fire_id)` unique index on `alert_history` is the only source of truth — `INSERT` is filtered against existing rows before each send, so a fire is never emailed twice to the same subscriber. Restart the function mid-run? Safe. Replay a cron tick? Safe.

#### Required Edge Function secrets

| Secret                  | Where                                    | Notes                                              |
|-------------------------|------------------------------------------|----------------------------------------------------|
| `FIRMS_API_KEY`         | `supabase secrets set`                   | Same key as the Next.js app reads from `.env.local` |
| `GMAIL_FROM`            | `supabase secrets set`                   | Must be an address owned by the Gmail account that issued the App Password, e.g. `Fire Alert <your-account@gmail.com>` |
| `GMAIL_APP_PASSWORD`    | `supabase secrets set`                   | 16-char password from myaccount.google.com/apppasswords (2FA must be enabled) |
| `FIRM_ALERTS_BASE_URL`  | `supabase secrets set` (optional)        | Defaults to `http://localhost:3000` for dev        |
| `SUPABASE_URL`          | auto-injected                            | Per-function env                                   |
| `SUPABASE_SERVICE_ROLE_KEY` | auto-injected                         | Bypasses RLS — endpoint auth-gated manually       |

> Gmail sending limits: ~500 emails/day on a free Gmail account, up to ~2,000/day on Google Workspace. If the subscriber list grows past either ceiling, rotate to a Workspace account or move the digest pipeline to a dedicated transactional provider.

---

## 🧭 Routing summary

| Path             | Type            | Purpose                                          |
|------------------|-----------------|--------------------------------------------------|
| `/`              | Server          | Live map + stats + recent fires                  |
| `/login`         | Client          | Supabase email/password sign-in                  |
| `/register`      | Client          | Supabase email/password sign-up                  |
| `/dashboard`     | Server (auth)   | Subscription CRUD (RLS-protected)                |
| `/api/fires`     | Route handler   | Proxies NASA FIRMS + cache                       |
| `/api/check-fires/run` | Route handler (auth) | Server-side proxy that triggers the Edge Function with `CRON_SECRET`. Used by the "Ejecutar detector" button in `/dashboard`. |
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

- [x] Gmail SMTP (App Password) integration + Supabase Edge Function `check-fires`
- [x] pg_cron schedule every 15 min (see `supabase/cron.sql`)
- [x] Manual "Run now" button in dashboard (`ManualRunButton` + server-side proxy `/api/check-fires/run`)
- [ ] Alert history panel in `/dashboard` (currently a `Pronto` banner — backed by `alert_history`)
- [ ] Multi-language (i18n) — currently ES-only strings
- [ ] Realtime updates via Supabase channels
- [ ] Province-level heat trend chart

---

## ⚖️ Credits & licensing

- Fire data © **NASA FIRMS** (public domain)
- Map tiles © **OpenStreetMap** contributors & **CARTO**
- Application source: MIT (do whatever you'd like, attribution appreciated)
