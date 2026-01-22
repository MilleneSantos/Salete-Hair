create extension if not exists "pgcrypto";

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_categories_name_key'
  ) then
    alter table public.service_categories
      add constraint service_categories_name_key unique (name);
  end if;
end $$;

alter table public.services
  add column if not exists category_id uuid references public.service_categories(id);

insert into public.service_categories (name, sort_order, active)
values
  ('Cabelo', 1, true),
  ('Unhas', 2, true),
  ('Depilação', 3, true)
on conflict (name) do nothing;

update public.services
set category_id = (select id from public.service_categories where name = 'Cabelo')
where category_id is null
  and (
    name ilike '%progressiva%'
    or name ilike '%escova%'
    or name ilike '%corte%'
    or name ilike '%sobrancelha%'
  );

update public.services
set category_id = (select id from public.service_categories where name = 'Unhas')
where category_id is null
  and (
    name ilike '%unha%'
    or name ilike 'mão%'
    or name ilike 'pe%'
    or name ilike 'pé%'
  );

update public.services
set category_id = (select id from public.service_categories where name = 'Depilação')
where category_id is null
  and name ilike '%depila%';
