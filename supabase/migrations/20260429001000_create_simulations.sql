create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  simulation_data jsonb not null default '{}'::jsonb,
  results_data jsonb not null default '{}'::jsonb,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'arquivada')),
  pdf_url text
);

create index if not exists simulations_user_created_at_idx on public.simulations (user_id, created_at desc);
create index if not exists simulations_client_created_at_idx on public.simulations (client_id, created_at desc);

alter table public.simulations enable row level security;

drop policy if exists "Platform users can manage own simulations" on public.simulations;
create policy "Platform users can manage own simulations"
on public.simulations
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.account_id = public.current_platform_account_id()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.account_id = public.current_platform_account_id()
  )
);

grant select, insert, update, delete on public.simulations to authenticated;
