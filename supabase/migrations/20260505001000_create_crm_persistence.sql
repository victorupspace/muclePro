-- ============================================================================
-- CRM persistence layer
-- Adiciona quatro tabelas para mover do localStorage para o Supabase:
--   • pipeline_cards     → stage_updated_at, follow_up_at, position
--   • client_activities  → notas, logs de NBA, registros de contato
--   • client_documents   → uploads reais (substitui o mock)
--   • nba_executions     → histórico de Próxima Melhor Ação executada
--
-- Multi-tenancy: tudo via public.current_platform_account_id() (= auth.uid()).
-- Cada consultor só lê/escreve dados da própria conta.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. pipeline_cards
--    Um registro por cliente. Guarda metadados específicos do funil que hoje
--    vivem no localStorage (timestamp de mudança de etapa, follow-up override,
--    posição manual no Kanban).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.pipeline_cards (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  client_id uuid not null unique references public.clients(id) on delete cascade,
  stage text not null default 'novo' check (stage in (
    'novo', 'qualificando', 'proposta_enviada', 'em_negociacao', 'assinado',
    'migrando', 'ativo', 'inativo'
  )),
  stage_updated_at timestamptz not null default now(),
  follow_up_at timestamptz,
  position integer not null default 0,
  priority_score integer,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pipeline_cards_account_stage_idx
  on public.pipeline_cards (account_id, stage, position);

create index if not exists pipeline_cards_follow_up_idx
  on public.pipeline_cards (account_id, follow_up_at)
  where follow_up_at is not null;

-- Trigger: criar pipeline_card automaticamente quando um cliente é criado
create or replace function public.tg_create_pipeline_card()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pipeline_cards (account_id, client_id, stage, stage_updated_at)
  values (new.account_id, new.id, new.status, now())
  on conflict (client_id) do nothing;
  return new;
end;
$$;

drop trigger if exists pipeline_cards_autocreate on public.clients;
create trigger pipeline_cards_autocreate
after insert on public.clients
for each row execute function public.tg_create_pipeline_card();

-- Trigger: manter stage e stage_updated_at sincronizados quando o status muda
create or replace function public.tg_sync_pipeline_card_stage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    update public.pipeline_cards
    set stage = new.status,
        stage_updated_at = now(),
        updated_at = now()
    where client_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists pipeline_cards_sync_stage on public.clients;
create trigger pipeline_cards_sync_stage
after update on public.clients
for each row execute function public.tg_sync_pipeline_card_stage();

-- Backfill: criar pipeline_card para clientes que já existem
insert into public.pipeline_cards (account_id, client_id, stage, stage_updated_at)
select c.account_id, c.id, c.status, c.created_at
from public.clients c
where not exists (
  select 1 from public.pipeline_cards pc where pc.client_id = c.id
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. client_activities
--    Log unificado: notas, mudanças de status, registros de contato,
--    execuções de NBA, follow-ups concluídos, etc.
--    Substitui o antigo armazenamento em localStorage.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.client_activities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  kind text not null check (kind in (
    'criacao',
    'status',
    'segmento',
    'nota',
    'simulacao',
    'proposta',
    'documento',
    'migracao',
    'tarefa',
    'contato',
    'nba'
  )),
  title text not null,
  body text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists client_activities_client_created_at_idx
  on public.client_activities (client_id, created_at desc);
create index if not exists client_activities_account_kind_idx
  on public.client_activities (account_id, kind, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. client_documents
--    Uploads reais. Hoje a UI deriva pendências dinamicamente — esta tabela
--    permite registrar uploads concretos vinculados ao Supabase Storage.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  doc_type text not null check (doc_type in (
    'fatura',
    'procuracao',
    'contrato_assinado',
    'carta_denuncia',
    'smf',
    'cusd_ccer',
    'ccee',
    'contrato_social',
    'outros'
  )),
  status text not null default 'recebido' check (status in (
    'solicitado', 'recebido', 'aprovado', 'rejeitado', 'expirado'
  )),
  name text not null,
  storage_path text,
  size_kb integer not null default 0,
  expires_at timestamptz,
  requested_at timestamptz,
  uploaded_at timestamptz default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_documents_client_idx
  on public.client_documents (client_id, created_at desc);
create index if not exists client_documents_account_status_idx
  on public.client_documents (account_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. nba_executions
--    Histórico de Próxima Melhor Ação executada pelo consultor.
--    Útil para métricas, evita re-sugerir a mesma ação por X horas.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.nba_executions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  executed_by uuid references auth.users(id) on delete set null,
  action_type text not null check (action_type in (
    'proposal_expiring',
    'proposal_opened',
    'proposal_opened_multiple_times',
    'simulation_without_pdf',
    'inactive_client',
    'high_savings_opportunity',
    'pending_document',
    'migration_stalled'
  )),
  cta_action text not null check (cta_action in (
    'register_contact',
    'generate_pdf',
    'create_followup',
    'request_document',
    'open_timeline',
    'open_client',
    'new_simulation'
  )),
  priority text not null check (priority in ('low', 'medium', 'high', 'critical')),
  title text not null,
  reason text,
  outcome text,
  executed_at timestamptz not null default now()
);

create index if not exists nba_executions_client_idx
  on public.nba_executions (client_id, executed_at desc);
create index if not exists nba_executions_account_idx
  on public.nba_executions (account_id, executed_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at triggers (genérico)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pipeline_cards_set_updated_at on public.pipeline_cards;
create trigger pipeline_cards_set_updated_at
before update on public.pipeline_cards
for each row execute function public.tg_set_updated_at();

drop trigger if exists client_documents_set_updated_at on public.client_documents;
create trigger client_documents_set_updated_at
before update on public.client_documents
for each row execute function public.tg_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS (Row Level Security)
-- Cada consultor só vê os próprios dados.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.pipeline_cards   enable row level security;
alter table public.client_activities enable row level security;
alter table public.client_documents enable row level security;
alter table public.nba_executions   enable row level security;

-- pipeline_cards
drop policy if exists "Platform users can manage own pipeline cards"
  on public.pipeline_cards;
create policy "Platform users can manage own pipeline cards"
on public.pipeline_cards
for all
to authenticated
using (account_id = public.current_platform_account_id())
with check (
  account_id = public.current_platform_account_id()
  and exists (
    select 1 from public.clients c
    where c.id = client_id
      and c.account_id = public.current_platform_account_id()
  )
);

-- client_activities
drop policy if exists "Platform users can manage own client activities"
  on public.client_activities;
create policy "Platform users can manage own client activities"
on public.client_activities
for all
to authenticated
using (account_id = public.current_platform_account_id())
with check (
  account_id = public.current_platform_account_id()
  and exists (
    select 1 from public.clients c
    where c.id = client_id
      and c.account_id = public.current_platform_account_id()
  )
);

-- client_documents
drop policy if exists "Platform users can manage own client documents"
  on public.client_documents;
create policy "Platform users can manage own client documents"
on public.client_documents
for all
to authenticated
using (account_id = public.current_platform_account_id())
with check (
  account_id = public.current_platform_account_id()
  and exists (
    select 1 from public.clients c
    where c.id = client_id
      and c.account_id = public.current_platform_account_id()
  )
);

-- nba_executions
drop policy if exists "Platform users can manage own NBA executions"
  on public.nba_executions;
create policy "Platform users can manage own NBA executions"
on public.nba_executions
for all
to authenticated
using (account_id = public.current_platform_account_id())
with check (
  account_id = public.current_platform_account_id()
  and exists (
    select 1 from public.clients c
    where c.id = client_id
      and c.account_id = public.current_platform_account_id()
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Permissões
-- ─────────────────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.pipeline_cards    to authenticated;
grant select, insert, update, delete on public.client_activities to authenticated;
grant select, insert, update, delete on public.client_documents  to authenticated;
grant select, insert, update, delete on public.nba_executions    to authenticated;

-- Realtime (opcional — habilita replicação para sincronização entre abas)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.pipeline_cards;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.client_activities;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.client_documents;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.nba_executions;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
