-- ============================================================================
-- Visão do dono:
--   • account_settings      metas do mês e preferências do resumo diário
--   • students.churn_*      motivo de saída obrigatório ao inativar
--   • team_activity_log     registro do que a equipe faz, gravado por
--                           triggers (o navegador não escreve nem apaga)
-- ============================================================================

-- ───────────────────────────── metas e resumo diário ───────────────────────

create table if not exists public.account_settings (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  revenue_goal numeric(12,2) check (revenue_goal is null or revenue_goal >= 0),
  active_students_goal integer check (active_students_goal is null or active_students_goal >= 0),
  digest_enabled boolean not null default false,
  digest_email text,
  digest_last_sent_on date,
  updated_at timestamptz not null default now()
);

drop trigger if exists account_settings_set_updated_at on public.account_settings;
create trigger account_settings_set_updated_at
before update on public.account_settings
for each row execute function public.tg_set_updated_at();

alter table public.account_settings enable row level security;

drop policy if exists "Platform users read settings" on public.account_settings;
create policy "Platform users read settings"
on public.account_settings for select to authenticated
using (account_id = public.current_platform_account_id());

drop policy if exists "Managers write settings" on public.account_settings;
create policy "Managers write settings"
on public.account_settings for all to authenticated
using (account_id = public.current_platform_account_id() and public.current_is_manager())
with check (account_id = public.current_platform_account_id() and public.current_is_manager());

grant select, insert, update on public.account_settings to authenticated;

-- ───────────────────────────── motivo de saída ─────────────────────────────

alter table public.students
  add column if not exists churn_reason text check (
    churn_reason is null or churn_reason in (
      'preco', 'mudanca', 'horario', 'saude', 'insatisfacao', 'financeiro', 'outro'
    )
  ),
  add column if not exists churn_notes text,
  add column if not exists churned_at timestamptz;

-- Inativar exige motivo; reativar limpa o motivo.
create or replace function public.tg_students_churn()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'inativo' and (tg_op = 'INSERT' or old.status is distinct from 'inativo') then
    if new.churn_reason is null then
      raise exception 'Informe o motivo da saída para inativar o aluno.'
        using errcode = 'check_violation';
    end if;
    new.churned_at := coalesce(new.churned_at, now());
  elsif new.status = 'ativo' and tg_op = 'UPDATE' and old.status = 'inativo' then
    new.churn_reason := null;
    new.churn_notes := null;
    new.churned_at := null;
  end if;
  return new;
end;
$$;

-- Alunos inativos que já existiam ficam com motivo "outro".
update public.students
set churn_reason = 'outro', churned_at = coalesce(churned_at, updated_at)
where status = 'inativo' and churn_reason is null;

drop trigger if exists students_churn on public.students;
create trigger students_churn
before insert or update on public.students
for each row execute function public.tg_students_churn();

create index if not exists students_churned_at_idx
  on public.students (account_id, churned_at desc) where churned_at is not null;

-- ───────────────────────────── registro de atividades ──────────────────────

create table if not exists public.team_activity_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  actor_user_id uuid,
  actor_name text not null,
  actor_role text,
  entity_type text not null check (entity_type in ('aluno', 'pagamento', 'plano', 'funcionario', 'unidade', 'tarefa')),
  entity_id uuid,
  action text not null check (action in ('criou', 'editou', 'excluiu', 'recebeu', 'cancelou', 'inativou', 'reativou', 'concluiu', 'acesso')),
  summary text not null,
  metadata jsonb
);

create index if not exists team_activity_log_account_idx
  on public.team_activity_log (account_id, created_at desc);
create index if not exists team_activity_log_actor_idx
  on public.team_activity_log (account_id, actor_user_id, created_at desc);

alter table public.team_activity_log enable row level security;

drop policy if exists "Managers read team log" on public.team_activity_log;
create policy "Managers read team log"
on public.team_activity_log for select to authenticated
using (account_id = public.current_platform_account_id() and public.current_is_manager());

grant select on public.team_activity_log to authenticated;

-- Quem fez: dono, funcionário ou o sistema (service role / automações).
create or replace function public.log_actor(p_account uuid, out actor_id uuid, out actor_name text, out actor_role text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  actor_id := auth.uid();
  if actor_id is null then
    actor_name := 'Sistema';
    actor_role := 'sistema';
    return;
  end if;
  select a.full_name, 'dono' into actor_name, actor_role
  from public.accounts a where a.id = p_account and a.auth_user_id = actor_id;
  if actor_name is null then
    select s.full_name, s.role into actor_name, actor_role
    from public.staff s where s.account_id = p_account and s.auth_user_id = actor_id;
  end if;
  if actor_name is null then
    actor_name := 'Sistema';
    actor_role := 'sistema';
  end if;
end;
$$;

create or replace function public.write_team_log(
  p_account uuid, p_entity text, p_entity_id uuid, p_action text, p_summary text, p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  select * into v from public.log_actor(p_account);
  insert into public.team_activity_log (account_id, actor_user_id, actor_name, actor_role, entity_type, entity_id, action, summary, metadata)
  values (p_account, v.actor_id, v.actor_name, v.actor_role, p_entity, p_entity_id, p_action, p_summary, p_metadata);
end;
$$;

revoke all on function public.write_team_log(uuid, text, uuid, text, text, jsonb) from public, anon, authenticated;

create or replace function public.brl(v numeric)
returns text
language sql
immutable
as $$
  select 'R$ ' || replace(replace(replace(to_char(coalesce(v, 0), 'FM999G999G990D00'), ',', '#'), '.', ','), '#', '.');
$$;

-- alunos
create or replace function public.tg_log_students()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  if tg_op = 'INSERT' then
    perform public.write_team_log(new.account_id, 'aluno', new.id, 'criou', 'Cadastrou o aluno ' || new.full_name);
  elsif tg_op = 'DELETE' then
    perform public.write_team_log(old.account_id, 'aluno', old.id, 'excluiu', 'Excluiu o aluno ' || old.full_name);
  else
    if new.status is distinct from old.status then
      if new.status = 'inativo' then
        perform public.write_team_log(new.account_id, 'aluno', new.id, 'inativou',
          'Inativou ' || new.full_name, jsonb_build_object('motivo', new.churn_reason, 'obs', new.churn_notes));
      else
        perform public.write_team_log(new.account_id, 'aluno', new.id, 'reativou', 'Reativou ' || new.full_name);
      end if;
    elsif new.plan_id is distinct from old.plan_id then
      select p.name into v_plan from public.plans p where p.id = new.plan_id;
      perform public.write_team_log(new.account_id, 'aluno', new.id, 'editou',
        case when v_plan is null then 'Removeu o plano de ' || new.full_name
             else 'Vinculou ' || new.full_name || ' ao plano ' || v_plan end);
    elsif (new.full_name, new.whatsapp, new.email, new.cpf, new.birth_date, new.unit_id, new.medical_notes,
           new.emergency_contact_name, new.emergency_contact_phone, new.notes)
          is distinct from
          (old.full_name, old.whatsapp, old.email, old.cpf, old.birth_date, old.unit_id, old.medical_notes,
           old.emergency_contact_name, old.emergency_contact_phone, old.notes) then
      perform public.write_team_log(new.account_id, 'aluno', new.id, 'editou', 'Editou o cadastro de ' || new.full_name);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists students_team_log on public.students;
create trigger students_team_log
after insert or update or delete on public.students
for each row execute function public.tg_log_students();

-- pagamentos
create or replace function public.tg_log_payments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student text;
  v_row public.payments;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;
  select s.full_name into v_student from public.students s where s.id = v_row.student_id;
  v_student := coalesce(v_student, 'aluno removido');

  if tg_op = 'INSERT' then
    -- ciclos abertos automaticamente após um pagamento não poluem o registro
    if v_row.reference_label is not null and v_row.plan_id is not null and auth.uid() is not null
       and exists (
         select 1 from public.payments p
         where p.student_id = v_row.student_id and p.status = 'pago' and p.paid_at > now() - interval '1 minute'
       ) then
      return null;
    end if;
    perform public.write_team_log(v_row.account_id, 'pagamento', v_row.id, 'criou',
      'Criou cobrança de ' || public.brl(v_row.amount) || ' para ' || v_student);
  elsif tg_op = 'DELETE' then
    perform public.write_team_log(v_row.account_id, 'pagamento', v_row.id, 'excluiu',
      'Excluiu cobrança de ' || public.brl(v_row.amount) || ' de ' || v_student);
  elsif new.status is distinct from old.status then
    if new.status = 'pago' then
      perform public.write_team_log(new.account_id, 'pagamento', new.id, 'recebeu',
        'Registrou pagamento de ' || public.brl(new.amount) || ' de ' || v_student,
        jsonb_build_object('metodo', new.method));
    elsif new.status = 'cancelado' then
      perform public.write_team_log(new.account_id, 'pagamento', new.id, 'cancelou',
        'Cancelou cobrança de ' || public.brl(new.amount) || ' de ' || v_student);
    end if;
  elsif new.amount is distinct from old.amount or new.due_at is distinct from old.due_at then
    perform public.write_team_log(new.account_id, 'pagamento', new.id, 'editou',
      'Alterou cobrança de ' || v_student || ' para ' || public.brl(new.amount));
  end if;
  return null;
end;
$$;

drop trigger if exists payments_team_log on public.payments;
create trigger payments_team_log
after insert or update or delete on public.payments
for each row execute function public.tg_log_payments();

-- planos
create or replace function public.tg_log_plans()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_team_log(new.account_id, 'plano', new.id, 'criou',
      'Criou o plano ' || new.name || ' (' || public.brl(new.amount) || ')');
  elsif tg_op = 'DELETE' then
    perform public.write_team_log(old.account_id, 'plano', old.id, 'excluiu', 'Excluiu o plano ' || old.name);
  elsif new.amount is distinct from old.amount then
    perform public.write_team_log(new.account_id, 'plano', new.id, 'editou',
      'Mudou o valor do plano ' || new.name || ' de ' || public.brl(old.amount) || ' para ' || public.brl(new.amount));
  elsif (new.name, new.frequency, new.active, new.description) is distinct from (old.name, old.frequency, old.active, old.description) then
    perform public.write_team_log(new.account_id, 'plano', new.id, 'editou', 'Editou o plano ' || new.name);
  end if;
  return null;
end;
$$;

drop trigger if exists plans_team_log on public.plans;
create trigger plans_team_log
after insert or update or delete on public.plans
for each row execute function public.tg_log_plans();

-- equipe
create or replace function public.tg_log_staff()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_team_log(new.account_id, 'funcionario', new.id, 'criou', 'Cadastrou o funcionário ' || new.full_name);
  elsif tg_op = 'DELETE' then
    perform public.write_team_log(old.account_id, 'funcionario', old.id, 'excluiu', 'Excluiu o funcionário ' || old.full_name);
  elsif new.auth_user_id is distinct from old.auth_user_id then
    perform public.write_team_log(new.account_id, 'funcionario', new.id, 'acesso',
      case when new.auth_user_id is null then 'Acesso de ' || new.full_name || ' removido'
           else 'Acesso liberado para ' || new.full_name end);
  elsif new.access_invited_at is distinct from old.access_invited_at and new.access_invited_at is not null then
    perform public.write_team_log(new.account_id, 'funcionario', new.id, 'acesso', 'Novo link de acesso para ' || new.full_name);
  elsif new.access_accepted_at is distinct from old.access_accepted_at and new.access_accepted_at is not null then
    perform public.write_team_log(new.account_id, 'funcionario', new.id, 'acesso', new.full_name || ' criou a senha e entrou');
  elsif new.active is distinct from old.active then
    perform public.write_team_log(new.account_id, 'funcionario', new.id, case when new.active then 'reativou' else 'inativou' end,
      case when new.active then 'Reativou ' else 'Inativou ' end || new.full_name);
  elsif (new.role, new.unit_id, new.can_register_students, new.can_send_payment_links, new.can_create_workouts)
        is distinct from (old.role, old.unit_id, old.can_register_students, old.can_send_payment_links, old.can_create_workouts) then
    perform public.write_team_log(new.account_id, 'funcionario', new.id, 'editou', 'Alterou perfil ou permissões de ' || new.full_name);
  elsif (new.full_name, new.email, new.phone, new.cpf, new.started_at, new.ended_at, new.notes)
        is distinct from (old.full_name, old.email, old.phone, old.cpf, old.started_at, old.ended_at, old.notes) then
    perform public.write_team_log(new.account_id, 'funcionario', new.id, 'editou', 'Editou o cadastro de ' || new.full_name);
  end if;
  return null;
end;
$$;

drop trigger if exists staff_team_log on public.staff;
create trigger staff_team_log
after insert or update or delete on public.staff
for each row execute function public.tg_log_staff();

-- unidades
create or replace function public.tg_log_units()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_team_log(new.account_id, 'unidade', new.id, 'criou', 'Adicionou a unidade ' || new.name);
  elsif tg_op = 'DELETE' then
    perform public.write_team_log(old.account_id, 'unidade', old.id, 'excluiu', 'Excluiu a unidade ' || old.name);
  elsif (new.name, new.address, new.city, new.state, new.phone, new.is_main, new.active)
        is distinct from (old.name, old.address, old.city, old.state, old.phone, old.is_main, old.active) then
    perform public.write_team_log(new.account_id, 'unidade', new.id, 'editou', 'Editou a unidade ' || new.name);
  end if;
  return null;
end;
$$;

drop trigger if exists units_team_log on public.units;
create trigger units_team_log
after insert or update or delete on public.units
for each row execute function public.tg_log_units();

-- tarefas: criação, conclusão e exclusão
create or replace function public.tg_log_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_team_log(new.account_id, 'tarefa', new.id, 'criou', 'Criou a tarefa "' || new.title || '"');
  elsif tg_op = 'DELETE' then
    perform public.write_team_log(old.account_id, 'tarefa', old.id, 'excluiu', 'Excluiu a tarefa "' || old.title || '"');
  elsif new.done is distinct from old.done and new.done then
    perform public.write_team_log(new.account_id, 'tarefa', new.id, 'concluiu', 'Concluiu a tarefa "' || new.title || '"');
  end if;
  return null;
end;
$$;

drop trigger if exists tasks_team_log on public.tasks;
create trigger tasks_team_log
after insert or update or delete on public.tasks
for each row execute function public.tg_log_tasks();
