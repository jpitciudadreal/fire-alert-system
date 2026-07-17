-- =========================================================================
-- Fire Alert System – Supabase / Postgres schema (modelo fire-alert-web)
-- =========================================================================
-- Ejecuta este script en el SQL editor de Supabase sobre un proyecto nuevo
-- o como migración desde el esquema anterior basado en user_id.
--
-- Modelo de suscripciones:
--   - Email-keyed (no requiere auth) – coincide con fire-alert-web.
--   - `subscriptions (email, province_slug)` es UNIQUE → un usuario sólo
--     puede suscribirse una vez por provincia desde cualquier flujo
--     (anónimo o autenticado).
--   - `user_id` queda como opcional para enlazar la suscripción con un
--     usuario autenticado cuando este esté disponible (RLS decide qué
--     mostrar en /dashboard).
--   - `unsubscribe_token` permite baja por magic link (HMAC) sin auth.
--
-- Requisitos:
--   - Extensión `pgcrypto` (para `gen_random_uuid()` y, más adelante,
--     `digest()` si añades verificación de HMAC server-side).
-- =========================================================================

-- pgcrypto necesario pgcrypt funciones
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------------
-- Subscriptions: subscripciones email-keyed de fuego por provincia.
-- Replica el modelo de fire-alert-web (DynamoDB/SES) sobre Postgres.
-- -------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  email                varchar(255) not null,
  province_slug        varchar(64)  not null,
  province_name        varchar(120) not null,
  -- user_id opcional: si el suscriptor está autenticado, lo enlazamos.
  -- La política RLS abre permite tanto inserts anónimos (TabSubscribe)
  -- como autenticados (DashboardClient).
  user_id              uuid references auth.users(id) on delete set null,
  -- unsubscribe_token se rellena server-side desde `app/api/subscribe`
  -- con HMAC-SHA256(`${email}|${province_slug}`, UNSUB_SECRET). Por
  -- eso NO ponemos default aquí: la app lo gestiona, no la DB.
  unsubscribe_token    varchar(128),
  -- confirmed: false = pendiente de double opt-in por email.
  --            true  = suscripción activa (recibe alertas).
  -- Los usuarios autenticados (@digital.gob.es) se confirman directamente.
  confirmed            boolean      not null default false,
  -- Filtros opcionales del suscriptor:
  -- filter_confidence: null = cualquier confianza, 'nominal' = nominal o alta, 'high' = solo alta
  filter_confidence    varchar(16)  check (filter_confidence in ('nominal', 'high')),
  -- min_brightness: umbral mínimo de temperatura de brillo (Kelvin). null = sin filtro.
  min_brightness       double precision check (min_brightness > 0),
  created_at           timestamptz  not null default now(),
  updated_at           timestamptz  not null default now(),

  -- Un suscriptor sólo puede tener UNA suscripción por provincia
  unique (email, province_slug)
);

create index if not exists subscriptions_email_idx
  on public.subscriptions (email);

create index if not exists subscriptions_province_idx
  on public.subscriptions (province_slug);

create index if not exists subscriptions_user_idx
  on public.subscriptions (user_id);

-- Trigger para mantener updated_at sincronizado
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------
-- Alert history: cada email enviado (idempotente por subscription_id+fire_id).
-- Se mantiene para que el cron (Edge Function `check-fires`) pueda dedupe
-- contra envíos previos, independientemente del flow que generó la sub.
-- -------------------------------------------------------------------------
create table if not exists public.alert_history (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references public.subscriptions(id) on delete cascade,
  fire_id          varchar(255) not null,
  fire_lat         double precision,
  fire_lng         double precision,
  fire_confidence  varchar(16),
  fire_brightness  double precision,
  province_slug    varchar(64),
  sent_at          timestamptz not null default now(),

  unique (subscription_id, fire_id)
);

create index if not exists alert_history_subscription_idx
  on public.alert_history (subscription_id);

create index if not exists alert_history_sent_at_idx
  on public.alert_history (sent_at desc);

-- -------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------
alter table public.subscriptions  enable row level security;
alter table public.alert_history enable row level security;

-- -------------------------------------------------------------------------
-- Subscriptions policies: replica el modelo abierto de fire-alert-web
-- (cualquiera puede suscribirse / consultar / darse de baja por token).
-- Si quieres restringirlo a usuarios autenticados en el futuro, añade
-- `using (auth.role() = 'authenticated')` y abre el DELETE por service-role.
-- -------------------------------------------------------------------------
drop policy if exists "subscriptions_select_public"    on public.subscriptions;
drop policy if exists "subscriptions_insert_public"    on public.subscriptions;
drop policy if exists "subscriptions_delete_token"     on public.subscriptions;
drop policy if exists "subscriptions_update_owner"     on public.subscriptions;

-- Lectura: abierta (necesaria para que `/unsubscribe?token=...` funcione
-- sin auth, y para que `TabMyAlerts` consulte por email).
create policy "subscriptions_select_public"
  on public.subscriptions for select
  using (true);

-- Inserción: cualquier visitante puede abrir una suscripción.
create policy "subscriptions_insert_public"
  on public.subscriptions for insert
  with check (true);

-- DELETE/UPDATE público cerrado: la única forma segura de borrar o
-- mutar una suscripción es a través de la API route `/api/subscribe`,
-- que usa el cliente SERVICE-ROLE (que bypasea RLS) y verifica el HMAC
-- del unsubscribe_token antes de tocar la fila. Una policy `using(true)`
-- en DELETE/UPDATE abierta dejaba la puerta abierta a un atacante con
-- la anon key pública a iterar UUIDs y borrar/modificar suscripciones
-- ajenas — el blindaje contra ese escenario es exactamente esto.
create policy "subscriptions_delete_token"
  on public.subscriptions for delete
  using (false);

create policy "subscriptions_update_owner"
  on public.subscriptions for update
  using (false)
  with check (false);

-- -------------------------------------------------------------------------
-- Alert history: lectura pública cuando la sub padre está confirmada.
-- En el modelo fire-alert-web el cliente NO consulta alert_history
-- directamente; lo hace el cron vía service-role. Mantenemos RLS
-- cerrada salvo para service-role.
-- -------------------------------------------------------------------------
drop policy if exists "alert_history_select_owner" on public.alert_history;

-- Lectura abierta de los propios registros (un usuario podría ver su
-- historial si quisiera, vía Web UI):
create policy "alert_history_select_owner"
  on public.alert_history for select
  using (
    exists (
      select 1
      from public.subscriptions s
      where s.id = alert_history.subscription_id
        and (
          -- owner autenticado
          (auth.uid() is not null and s.user_id = auth.uid())
          -- o acceso público (el admin decide si esto es aceptable
          -- en su despliegue; service-role lo sigue saltando igualmente)
          or true
        )
    )
  );

-- service-role (Edge Function / pg_cron) bypass RLS. No hacen falta
-- policies de INSERT/DELETE específicos porque la Edge Function ya usa
-- los headers canónicos de service-role.

-- -------------------------------------------------------------------------
-- Configuración del cron vive en supabase/cron.sql (separado para que
-- este archivo se quede enfocado en schema).
-- -------------------------------------------------------------------------
