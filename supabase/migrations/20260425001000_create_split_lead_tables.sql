create extension if not exists pgcrypto;

create table if not exists public.hero_form_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text not null,
  email text not null,
  client_type text not null check (client_type in ('consultor', 'comercializadora', 'consumidor')),
  regions text[] not null default '{}',
  has_partner_network boolean,
  commercializer_size text,
  segment text,
  monthly_energy_spend text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.consultor_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text not null,
  email text not null,
  document_type text not null check (document_type in ('cnpj', 'cpf')),
  document text not null,
  company_name text,
  address text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.comercializadora_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text not null,
  email text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.consumidor_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text not null,
  email text not null,
  segment text,
  monthly_energy_spend text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.hero_form_submissions enable row level security;
alter table public.consultor_registrations enable row level security;
alter table public.comercializadora_registrations enable row level security;
alter table public.consumidor_registrations enable row level security;

drop policy if exists "Anyone can create hero form submissions" on public.hero_form_submissions;
create policy "Anyone can create hero form submissions"
on public.hero_form_submissions
for insert
to anon, authenticated
with check (
  length(trim(full_name)) > 2
  and position('@' in email) > 1
  and length(trim(phone)) >= 8
);

drop policy if exists "Anyone can create consultor registrations" on public.consultor_registrations;
create policy "Anyone can create consultor registrations"
on public.consultor_registrations
for insert
to anon, authenticated
with check (
  length(trim(full_name)) > 2
  and position('@' in email) > 1
  and length(trim(phone)) >= 8
  and length(trim(document)) >= 11
);

drop policy if exists "Anyone can create comercializadora registrations" on public.comercializadora_registrations;
create policy "Anyone can create comercializadora registrations"
on public.comercializadora_registrations
for insert
to anon, authenticated
with check (
  length(trim(full_name)) > 2
  and position('@' in email) > 1
  and length(trim(phone)) >= 8
);

drop policy if exists "Anyone can create consumidor registrations" on public.consumidor_registrations;
create policy "Anyone can create consumidor registrations"
on public.consumidor_registrations
for insert
to anon, authenticated
with check (
  length(trim(full_name)) > 2
  and position('@' in email) > 1
  and length(trim(phone)) >= 8
);

grant usage on schema public to anon, authenticated;
grant insert on public.hero_form_submissions to anon, authenticated;
grant insert on public.consultor_registrations to anon, authenticated;
grant insert on public.comercializadora_registrations to anon, authenticated;
grant insert on public.consumidor_registrations to anon, authenticated;
