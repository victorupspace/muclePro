create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  account_id uuid not null unique references public.accounts(id) on delete cascade,
  full_name text not null,
  email text not null,
  company_name text,
  role text not null default 'owner' check (role in ('owner', 'member')),
  active boolean not null default true
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  company_name text,
  email text not null,
  phone text not null,
  segment text,
  monthly_savings numeric(12,2),
  status text not null default 'prospecto' check (status in ('ativo', 'prospecto', 'perdido'))
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  due_at timestamptz,
  priority text not null default 'media' check (priority in ('baixa', 'media', 'alta')),
  done boolean not null default false
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  amount numeric(12,2) not null default 0,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'aceita', 'recusada')),
  sent_at timestamptz
);

create index if not exists users_auth_user_id_idx on public.users (auth_user_id);
create index if not exists users_account_id_idx on public.users (account_id);
create index if not exists clients_account_created_at_idx on public.clients (account_id, created_at desc);
create index if not exists tasks_account_done_due_at_idx on public.tasks (account_id, done, due_at);
create index if not exists tasks_client_id_idx on public.tasks (client_id);
create index if not exists proposals_account_created_at_idx on public.proposals (account_id, created_at desc);
create index if not exists proposals_client_id_idx on public.proposals (client_id);

create or replace function public.current_platform_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.id
  from public.accounts a
  where a.auth_user_id = auth.uid()
    and a.status = 'criada'
    and a.active = true
  limit 1;
$$;

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.tasks enable row level security;
alter table public.proposals enable row level security;

drop policy if exists "Platform users can read own profile" on public.users;
create policy "Platform users can read own profile"
on public.users
for select
to authenticated
using (account_id = public.current_platform_account_id());

drop policy if exists "Platform users can create own profile" on public.users;
create policy "Platform users can create own profile"
on public.users
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  and account_id = public.current_platform_account_id()
);

drop policy if exists "Platform users can update own profile" on public.users;
create policy "Platform users can update own profile"
on public.users
for update
to authenticated
using (account_id = public.current_platform_account_id())
with check (
  auth_user_id = auth.uid()
  and account_id = public.current_platform_account_id()
);

drop policy if exists "Platform users can manage own clients" on public.clients;
create policy "Platform users can manage own clients"
on public.clients
for all
to authenticated
using (account_id = public.current_platform_account_id())
with check (account_id = public.current_platform_account_id());

drop policy if exists "Platform users can manage own tasks" on public.tasks;
create policy "Platform users can manage own tasks"
on public.tasks
for all
to authenticated
using (account_id = public.current_platform_account_id())
with check (
  account_id = public.current_platform_account_id()
  and (
    client_id is null
    or exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.account_id = public.current_platform_account_id()
    )
  )
);

drop policy if exists "Platform users can manage own proposals" on public.proposals;
create policy "Platform users can manage own proposals"
on public.proposals
for all
to authenticated
using (account_id = public.current_platform_account_id())
with check (
  account_id = public.current_platform_account_id()
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.account_id = public.current_platform_account_id()
  )
);

grant execute on function public.current_platform_account_id() to authenticated;
grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.proposals to authenticated;
