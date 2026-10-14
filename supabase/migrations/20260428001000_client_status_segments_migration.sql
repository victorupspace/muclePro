alter table public.clients
  drop constraint if exists clients_status_check;

update public.clients
set status = case
  when status = 'prospecto' then 'novo'
  when status = 'perdido' then 'inativo'
  else status
end
where status in ('prospecto', 'perdido');

alter table public.clients
  alter column status set default 'novo';

alter table public.clients
  add constraint clients_status_check
  check (status in ('novo', 'qualificando', 'em_negociacao', 'migrando', 'ativo', 'inativo'));

create table if not exists public.client_segments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  unique (account_id, name)
);

create table if not exists public.client_migration_steps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  step_name text not null check (
    step_name in (
      'diagnostico',
      'simulacao',
      'proposta_enviada',
      'proposta_aceita',
      'denuncia',
      'contratos',
      'smf',
      'ccee',
      'ativo_ml'
    )
  ),
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluido')),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, step_name)
);

create table if not exists public.client_migration_documents (
  id uuid primary key default gen_random_uuid(),
  migration_step_id uuid not null references public.client_migration_steps(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  size_kb integer not null default 0,
  storage_path text
);

create index if not exists client_segments_account_name_idx on public.client_segments (account_id, name);
create index if not exists client_migration_steps_client_idx on public.client_migration_steps (client_id);
create index if not exists client_migration_documents_step_idx on public.client_migration_documents (migration_step_id);

alter table public.client_segments enable row level security;
alter table public.client_migration_steps enable row level security;
alter table public.client_migration_documents enable row level security;

drop policy if exists "Platform users can manage own client segments" on public.client_segments;
create policy "Platform users can manage own client segments"
on public.client_segments
for all
to authenticated
using (account_id = public.current_platform_account_id())
with check (account_id = public.current_platform_account_id() and created_by = auth.uid());

drop policy if exists "Platform users can manage own migration steps" on public.client_migration_steps;
create policy "Platform users can manage own migration steps"
on public.client_migration_steps
for all
to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.account_id = public.current_platform_account_id()
  )
)
with check (
  exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.account_id = public.current_platform_account_id()
  )
);

drop policy if exists "Platform users can manage own migration documents" on public.client_migration_documents;
create policy "Platform users can manage own migration documents"
on public.client_migration_documents
for all
to authenticated
using (
  exists (
    select 1
    from public.client_migration_steps s
    join public.clients c on c.id = s.client_id
    where s.id = migration_step_id
      and c.account_id = public.current_platform_account_id()
  )
)
with check (
  exists (
    select 1
    from public.client_migration_steps s
    join public.clients c on c.id = s.client_id
    where s.id = migration_step_id
      and c.account_id = public.current_platform_account_id()
  )
);

grant select, insert, update, delete on public.client_segments to authenticated;
grant select, insert, update, delete on public.client_migration_steps to authenticated;
grant select, insert, update, delete on public.client_migration_documents to authenticated;
