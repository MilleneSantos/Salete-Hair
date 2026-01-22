create extension if not exists "pgcrypto";

create table if not exists public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id),
  professional_id uuid not null references public.professionals(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  order_index integer not null default 0,
  duration_minutes_snapshot integer not null default 0,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointment_services_appointment_order_key'
  ) then
    alter table public.appointment_services
      add constraint appointment_services_appointment_order_key
      unique (appointment_id, order_index);
  end if;
end $$;
