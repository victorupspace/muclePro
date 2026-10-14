-- Expande as etapas comerciais do CRM/Pipeline para separar proposta enviada
-- e contrato assinado das etapas de negociação e migração.

alter table public.clients
  drop constraint if exists clients_status_check;

alter table public.clients
  add constraint clients_status_check
  check (status in (
    'novo',
    'qualificando',
    'proposta_enviada',
    'em_negociacao',
    'assinado',
    'migrando',
    'ativo',
    'inativo'
  ));

alter table public.pipeline_cards
  drop constraint if exists pipeline_cards_stage_check;

alter table public.pipeline_cards
  add constraint pipeline_cards_stage_check
  check (stage in (
    'novo',
    'qualificando',
    'proposta_enviada',
    'em_negociacao',
    'assinado',
    'migrando',
    'ativo',
    'inativo'
  ));
