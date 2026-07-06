-- =========================================================================
-- Fire Alert – pg_cron schedule for the `check-fires` Edge Function
-- =========================================================================
-- Run this in the Supabase SQL editor AFTER:
--   1. Deploying the Edge Function:        supabase functions deploy check-fires
--   2. Configuring Edge Function secrets:
--        supabase secrets set CRON_SECRET=<strong-random-string>
--        supabase secrets set FIRMS_API_KEY=<map-key-from-firms.modaps.eosdis.nasa.gov>
--        supabase secrets set GMAIL_FROM='Fire Alert <your-account@gmail.com>'
--        supabase secrets set GMAIL_APP_PASSWORD=<16-char-app-password>
--   3. Mirroring the CRON_SECRET in Supabase Vault so pg_cron can read it:
--        select vault.create_secret(
--          '<strong-random-string>',  -- must equal the Edge Function secret
--          'cron_secret',
--          'Bearer used by pg_cron to invoke the check-fires Edge Function'
--        );
--   4. Replacing `<project-ref>` below with your Supabase project ref
--      (Dashboard → Project Settings → General → Reference ID, e.g.
--      `abcdefghij` from `https://abcdefghij.supabase.co`).
--
-- Requires `pg_cron` and `pg_net` extensions. Enable them in
-- Dashboard → Database → Extensions if they aren't already.
-- =========================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ------------------------------------------------------------------------
-- Idempotent reschedule: drop the existing job if present.
--
-- cron.unschedule(name text) returns void and raises a warning if the
-- job does not exist, so we wrap the call in a DO block guarded by an
-- existence check. (The previous form
--   `select cron.unschedule('…') where exists (…)` was a hard syntax
--   error — `select cron.fn() where …` is not valid SQL because pg_cron
--   doesn't return a relation.)
-- ------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'check-new-fires') then
    perform cron.unschedule('check-new-fires');
  end if;
end $$;

-- ------------------------------------------------------------------------
-- Schedule the cron job.
--
-- `vault.decrypted_secrets` decrypts on read; the only row matching
-- `name = 'cron_secret'` is the one we created above. Rotating the
-- secret means updating both `supabase secrets` AND `vault.create_secret`
-- (or rotating the existing Vault secret with `vault.rotate_secret` on
-- Supabase managed Vaults).
--
-- `timeout_milliseconds` makes net.http_post give up instead of
-- spilling into request queues if the Edge Function is unreachable.
-- Gmail SMTP is fast (one TLS handshake + ~6 round-trips), so 15s is
-- plenty for a few dozen subscribers — bump if your fan-out grows.
-- ------------------------------------------------------------------------
select cron.schedule(
  'check-new-fires',
  '*/15 * * * *', -- every 15 minutes
  $$
    select net.http_post(
      url     := 'https://bbggrzkekjmgtwtuxfcg.supabase.co/functions/v1/check-fires',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_secret'
        )
      ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 15000
    );
  $$
);

-- ------------------------------------------------------------------------
-- Inspect / debug
-- ------------------------------------------------------------------------
-- View registered jobs:
--   select * from cron.job where jobname = 'check-new-fires';
--
-- View recent net.http_post activity (Supabase pg_net):
--   select id, status, created_at, headers
--   from net._http_response
--   order by created_at desc
--   limit 20;
--
-- Manually invoke the Edge Function once (useful for dry runs):
--   select net.http_post(
--     url     := 'https://<project-ref>.supabase.co/functions/v1/check-fires',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (
--         select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'
--       )
--     ),
--     body    := '{}'::jsonb,
--     timeout_milliseconds := 15000
--   );
