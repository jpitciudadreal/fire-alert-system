-- =========================================================================
-- Fire Alert – pg_cron schedule for the `check-fires` Edge Function
-- =========================================================================
-- Run this in the Supabase SQL editor AFTER:
--   1. Deploying the Edge Function (`supabase functions deploy check-fires`)
--   2. Setting the Edge Function secret `app.functions_secret` to a
--      strong random string (`supabase secrets set app.functions_secret=…`)
--   3. Replacing `<project-ref>` below with your Supabase project ref
--      (the subdomain in your project URL, e.g. `abcdefghij` from
--      `https://abcdefghij.supabase.co`).
--
-- Requires the `pg_cron` and `pg_net` extensions. Enable them in
-- Dashboard → Database → Extensions if they aren't already.
-- =========================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Register the shared secret the below cron job will use to talk to the
-- Edge Function. MUST match the secret you set on the Edge Function
-- runtime (`supabase secrets set app.functions_secret=…`). Skip this
-- line if you've already configured it.
--
-- alter database postgres set app.functions_secret = '<strong-random-string>';

-- Idempotent: drop the existing job first if you already registered one.
select cron.unschedule('check-new-fires') where exists (
  select 1 from cron.job where jobname = 'check-new-fires'
);

select cron.schedule(
  'check-new-fires',
  '*/15 * * * *', -- every 15 minutes
  $$
    select net.http_post(
      url     := 'https://<project-ref>.supabase.co/functions/v1/check-fires',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.functions_secret', true)
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- Inspect:
-- select * from cron.job where jobname = 'check-new-fires';

-- Optional: rotate the secret (run after rotating `app.functions_secret`):
-- alter database postgres set app.functions_secret = '<new-value>';
