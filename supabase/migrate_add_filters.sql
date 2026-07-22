-- =========================================================================
-- Migración: añadir campos de filtros avanzados y double opt-in
-- Fecha: 2026-07
--
-- Aplica sobre la tabla `subscriptions` existente. Es idempotente:
-- usa `if not exists` y `alter column ... set default` seguros.
--
-- Ejecuta en el SQL Editor de Supabase (modo superusuario / service-role).
-- =========================================================================

-- 1. Columna filter_confidence
--    Posibles valores: null (sin filtro), 'nominal', 'high'
alter table public.subscriptions
  add column if not exists filter_confidence varchar(16)
  check (filter_confidence in ('nominal', 'high'));

-- 2. Columna min_brightness (temperatura de brillo en Kelvin)
--    null = sin filtro de brillo mínimo
alter table public.subscriptions
  add column if not exists min_brightness double precision
  check (min_brightness > 0);

-- 3. Cambiar el default de confirmed a false para nuevas suscripciones
--    (las suscripciones existentes mantienen su valor actual)
alter table public.subscriptions
  alter column confirmed set default false;

-- 4. Índice para acelerar las consultas del cron (solo confirmed = true)
create index if not exists subscriptions_confirmed_idx
  on public.subscriptions (confirmed)
  where confirmed = true;

-- =========================================================================
-- Trigger para validar dominio de email en el registro de Auth (opcional)
-- Requiere permisos de superusuario sobre el esquema auth.
--
-- Si no tienes acceso al esquema auth desde el SQL Editor, aplica esta
-- restricción solo en la capa de aplicación (ya implementada en
-- types/index.ts con Zod y en Supabase Auth Settings → "Email domain
-- allow list" si tu plan lo soporta).
-- =========================================================================

-- Función de validación de dominio (debe empezar por 'jp' y terminar por '@digital.gob.es')
create or replace function auth.validate_email_domain()
returns trigger as $$
begin
  if lower(new.email) not like 'jp%@digital.gob.es' then
    raise exception 'Solo se permiten registros de la Jefatura que comiencen por "jp" y pertenezcan al dominio @digital.gob.es. Tu email: %', new.email;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger en auth.users (solo se aplica si tienes acceso al esquema auth)
-- Si el SQL Editor devuelve un error de permisos, omite las siguientes líneas
-- y gestiona la restricción exclusivamente desde la UI de Supabase Auth.
drop trigger if exists trg_validate_email_domain on auth.users;
create trigger trg_validate_email_domain
  before insert on auth.users
  for each row execute function auth.validate_email_domain();
