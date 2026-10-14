create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  email text not null,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'operador')),
  active boolean not null default true
);

create or replace function public.is_musclepro_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role in ('admin', 'operador')
  );
$$;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null default 'consultor' check (kind in ('consultor', 'comercializadora')),
  full_name text not null,
  email text not null,
  phone text not null,
  document_type text not null check (document_type in ('cnpj', 'cpf')),
  document text not null,
  company_name text,
  address text,
  status text not null default 'nova' check (status in ('nova', 'criada')),
  active boolean not null default true,
  approved_at timestamptz,
  payment_status text not null default 'nao_iniciado' check (
    payment_status in ('em_dia', 'pendente', 'atrasado', 'trial', 'cancelado', 'nao_iniciado')
  ),
  payment_plan text,
  payment_monthly_amount numeric(12,2),
  payment_next_due_at timestamptz,
  payment_last_paid_at timestamptz,
  source text not null default 'cadastro',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.commercializer_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text not null,
  has_partner_network boolean,
  commercializer_size text,
  status text not null default 'aguardando' check (
    status in ('aguardando', 'em_contato', 'convertida', 'perdida')
  ),
  source text not null default 'cadastro',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  resource_type text not null check (resource_type in ('account', 'commercializer_lead')),
  resource_id uuid not null,
  label text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_label text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists accounts_status_created_at_idx
  on public.accounts (status, created_at desc);

create index if not exists accounts_email_idx
  on public.accounts (lower(email));

create index if not exists commercializer_leads_status_created_at_idx
  on public.commercializer_leads (status, created_at desc);

create index if not exists audit_events_resource_idx
  on public.audit_events (resource_type, resource_id, created_at desc);

alter table public.admin_profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.commercializer_leads enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "Admins can read admin profiles" on public.admin_profiles;
create policy "Admins can read admin profiles"
on public.admin_profiles
for select
to authenticated
using (public.is_musclepro_admin() or user_id = auth.uid());

drop policy if exists "Admins can manage admin profiles" on public.admin_profiles;
create policy "Admins can manage admin profiles"
on public.admin_profiles
for all
to authenticated
using (public.is_musclepro_admin())
with check (public.is_musclepro_admin());

drop policy if exists "Anyone can create new accounts" on public.accounts;
create policy "Anyone can create new accounts"
on public.accounts
for insert
to anon, authenticated
with check (
  status = 'nova'
  and active = true
  and approved_at is null
  and payment_status = 'nao_iniciado'
  and length(trim(full_name)) > 2
  and position('@' in email) > 1
  and length(trim(phone)) >= 8
  and length(trim(document)) >= 11
);

drop policy if exists "Admins can read accounts" on public.accounts;
create policy "Admins can read accounts"
on public.accounts
for select
to authenticated
using (public.is_musclepro_admin());

drop policy if exists "Admins can update accounts" on public.accounts;
create policy "Admins can update accounts"
on public.accounts
for update
to authenticated
using (public.is_musclepro_admin())
with check (public.is_musclepro_admin());

drop policy if exists "Admins can delete accounts" on public.accounts;
create policy "Admins can delete accounts"
on public.accounts
for delete
to authenticated
using (public.is_musclepro_admin());

drop policy if exists "Anyone can create commercializer leads" on public.commercializer_leads;
create policy "Anyone can create commercializer leads"
on public.commercializer_leads
for insert
to anon, authenticated
with check (
  status = 'aguardando'
  and length(trim(full_name)) > 2
  and position('@' in email) > 1
  and length(trim(phone)) >= 8
);

drop policy if exists "Admins can read commercializer leads" on public.commercializer_leads;
create policy "Admins can read commercializer leads"
on public.commercializer_leads
for select
to authenticated
using (public.is_musclepro_admin());

drop policy if exists "Admins can update commercializer leads" on public.commercializer_leads;
create policy "Admins can update commercializer leads"
on public.commercializer_leads
for update
to authenticated
using (public.is_musclepro_admin())
with check (public.is_musclepro_admin());

drop policy if exists "Admins can delete commercializer leads" on public.commercializer_leads;
create policy "Admins can delete commercializer leads"
on public.commercializer_leads
for delete
to authenticated
using (public.is_musclepro_admin());

drop policy if exists "Admins can read audit events" on public.audit_events;
create policy "Admins can read audit events"
on public.audit_events
for select
to authenticated
using (public.is_musclepro_admin());

drop policy if exists "Admins can create audit events" on public.audit_events;
create policy "Admins can create audit events"
on public.audit_events
for insert
to authenticated
with check (public.is_musclepro_admin());

grant execute on function public.is_musclepro_admin() to anon, authenticated;
grant select on public.admin_profiles to authenticated;
grant insert on public.accounts to anon, authenticated;
grant select, update, delete on public.accounts to authenticated;
grant insert on public.commercializer_leads to anon, authenticated;
grant select, update, delete on public.commercializer_leads to authenticated;
grant select, insert on public.audit_events to authenticated;
