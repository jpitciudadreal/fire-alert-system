-- =========================================================================
-- Fire Alert System – Supabase / Postgres schema
-- =========================================================================
-- Run this in the Supabase SQL editor on your project to create the tables,
-- indexes, triggers and Row Level Security policies used by the app.
-- =========================================================================

-- Required for `gen_random_uuid()`
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------------
-- Subscriptions: a user can subscribe to multiple province slugs
-- -------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  province_slug   varchar(64) not null,
  province_name   varchar(120) not null,
  email           varchar(255) not null,
  created_at      timestamptz not null default now(),

  -- One (user, province) pair per row
  unique (user_id, province_slug)
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id);

create index if not exists subscriptions_province_idx
  on public.subscriptions (province_slug);

-- -------------------------------------------------------------------------
-- Alert history: every email we tried to send
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

  -- Avoid duplicate alerts for the same fire per subscription
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

-- Subscriptions: users only see/edit their own
drop policy if exists "subscriptions_select_own"  on public.subscriptions;
drop policy if exists "subscriptions_insert_own"  on public.subscriptions;
drop policy if exists "subscriptions_delete_own"  on public.subscriptions;

create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "subscriptions_insert_own"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create policy "subscriptions_delete_own"
  on public.subscriptions for delete
  using (auth.uid() = user_id);

-- Alert history: visible through the owning subscription
drop policy if exists "alert_history_select_own" on public.alert_history;

create policy "alert_history_select_own"
  on public.alert_history for select
  using (
    exists (
      select 1
      from public.subscriptions s
      where s.id = alert_history.subscription_id
        and s.user_id = auth.uid()
    )
  );

-- The service role (used by Edge Functions & pg_cron) bypasses RLS.

-- -------------------------------------------------------------------------
-- Alert dispatch scheduling lives in supabase/cron.sql (kept separate
-- so this file stays focused on schema). After deploying the Edge
-- Function run that file to wire the pg_cron job.
-- -------------------------------------------------------------------------
