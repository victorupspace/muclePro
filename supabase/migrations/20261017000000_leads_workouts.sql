-- ============================================================================
-- musclePro · funil de matrículas e fichas de treino
--   • leads              interessados, do primeiro contato à matrícula
--   • lead_events        histórico do lead (etapas, notas, contatos)
--   • workout_programs   fichas de treino montadas pelo personal
-- Quem cadastra aluno cuida do funil; quem tem a permissão "treinos" monta
-- fichas. Tudo respeita a unidade do funcionário, como os alunos.
-- ============================================================================

-- ───────────────────────────── leads ───────────────────────────────────────

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  owner_staff_id uuid references public.staff(id) on delete set null,
  full_name text not null check (length(trim(full_name)) > 0),
  whatsapp text,
  email text,
  source text not null default 'outro'
    check (source in ('instagram', 'indicacao', 'passante', 'whatsapp', 'site', 'google', 'outro')),
  interest text,
  stage text not null default 'novo'
    check (stage in ('novo', 'contato', 'agendada', 'experimental', 'matriculado', 'perdido')),
  trial_at timestamptz,
  lost_reason text
    check (lost_reason is null or lost_reason in ('preco', 'horario', 'distancia', 'sem_resposta', 'concorrente', 'desistiu', 'outro')),
  lost_notes text,
  notes text,
  student_id uuid references public.students(id) on delete set null,
  stage_changed_at timestamptz not null default now(),
  converted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_account_stage_idx on public.leads (account_id, stage, stage_changed_at desc);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.tg_set_updated_at();

-- Etapa: data da mudança, conversão e motivo de perda coerentes.
create or replace function public.tg_leads_stage()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.stage is distinct from old.stage then
    new.stage_changed_at := now();
    if new.stage = 'matriculado' then
      new.converted_at := coalesce(new.converted_at, now());
    else
      new.converted_at := null;
    end if;
    if new.stage <> 'perdido' then
      new.lost_reason := null;
      new.lost_notes := null;
    elsif new.lost_reason is null then
      raise exception 'Informe o motivo da perda para mover o lead para Perdido.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_stage on public.leads;
create trigger leads_stage
before insert or update on public.leads
for each row execute function public.tg_leads_stage();

alter table public.leads enable row level security;

drop policy if exists "Platform users read leads in scope" on public.leads;
create policy "Platform users read leads in scope"
on public.leads for select to authenticated
using (
  account_id = public.current_platform_account_id()
  and (public.current_unit_scope() is null or unit_id is null or unit_id = public.current_unit_scope())
);

drop policy if exists "Allowed staff insert leads" on public.leads;
create policy "Allowed staff insert leads"
on public.leads for insert to authenticated
with check (
  account_id = public.current_platform_account_id()
  and public.current_can('register_students')
  and (public.current_unit_scope() is null or unit_id = public.current_unit_scope())
);

drop policy if exists "Allowed staff update leads" on public.leads;
create policy "Allowed staff update leads"
on public.leads for update to authenticated
using (
  account_id = public.current_platform_account_id()
  and public.current_can('register_students')
  and (public.current_unit_scope() is null or unit_id is null or unit_id = public.current_unit_scope())
)
with check (
  account_id = public.current_platform_account_id()
  and (public.current_unit_scope() is null or unit_id is null or unit_id = public.current_unit_scope())
);

drop policy if exists "Managers delete leads" on public.leads;
create policy "Managers delete leads"
on public.leads for delete to authenticated
using (account_id = public.current_platform_account_id() and public.current_is_manager());

grant select, insert, update, delete on public.leads to authenticated;

-- ───────────────────────────── histórico do lead ───────────────────────────

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  kind text not null check (kind in ('etapa', 'nota', 'contato')),
  body text,
  metadata jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  author_name text,
  created_at timestamptz not null default now()
);

create index if not exists lead_events_lead_idx on public.lead_events (lead_id, created_at desc);

-- Nome de quem escreveu, resolvido no banco (não confia no navegador).
create or replace function public.tg_lead_events_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  select * into v from public.log_actor(new.account_id);
  new.author_name := v.actor_name;
  new.created_by := v.actor_id;
  return new;
end;
$$;

drop trigger if exists lead_events_author on public.lead_events;
create trigger lead_events_author
before insert on public.lead_events
for each row execute function public.tg_lead_events_author();

alter table public.lead_events enable row level security;

drop policy if exists "Platform users read lead events" on public.lead_events;
create policy "Platform users read lead events"
on public.lead_events for select to authenticated
using (
  account_id = public.current_platform_account_id()
  and exists (select 1 from public.leads l where l.id = lead_id)
);

drop policy if exists "Allowed staff write lead events" on public.lead_events;
create policy "Allowed staff write lead events"
on public.lead_events for insert to authenticated
with check (
  account_id = public.current_platform_account_id()
  and public.current_can('register_students')
  and exists (select 1 from public.leads l where l.id = lead_id)
);

grant select, insert on public.lead_events to authenticated;

-- ───────────────────────────── fichas de treino ────────────────────────────
-- days = [{ "name": "A", "focus": "Peito e tríceps",
--           "exercises": [{ "name", "sets", "reps", "load", "rest", "notes" }] }]

create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  author_staff_id uuid references public.staff(id) on delete set null,
  author_name text,
  title text not null check (length(trim(title)) > 0),
  goal text,
  level text check (level is null or level in ('iniciante', 'intermediario', 'avancado')),
  notes text,
  days jsonb not null default '[]'::jsonb check (jsonb_typeof(days) = 'array'),
  starts_on date not null default current_date,
  review_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_programs_student_idx on public.workout_programs (account_id, student_id, active);

drop trigger if exists workout_programs_set_updated_at on public.workout_programs;
create trigger workout_programs_set_updated_at
before update on public.workout_programs
for each row execute function public.tg_set_updated_at();

create or replace function public.tg_workout_programs_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  select * into v from public.log_actor(new.account_id);
  new.author_name := v.actor_name;
  new.author_staff_id := public.current_staff_id();
  return new;
end;
$$;

drop trigger if exists workout_programs_author on public.workout_programs;
create trigger workout_programs_author
before insert on public.workout_programs
for each row execute function public.tg_workout_programs_author();

alter table public.workout_programs enable row level security;

drop policy if exists "Platform users read workouts of visible students" on public.workout_programs;
create policy "Platform users read workouts of visible students"
on public.workout_programs for select to authenticated
using (
  account_id = public.current_platform_account_id()
  and exists (select 1 from public.students s where s.id = student_id)
);

drop policy if exists "Allowed staff create workouts" on public.workout_programs;
create policy "Allowed staff create workouts"
on public.workout_programs for insert to authenticated
with check (
  account_id = public.current_platform_account_id()
  and public.current_can('workouts')
  and exists (select 1 from public.students s where s.id = student_id)
);

drop policy if exists "Allowed staff update workouts" on public.workout_programs;
create policy "Allowed staff update workouts"
on public.workout_programs for update to authenticated
using (
  account_id = public.current_platform_account_id()
  and public.current_can('workouts')
  and exists (select 1 from public.students s where s.id = student_id)
)
with check (account_id = public.current_platform_account_id());

drop policy if exists "Managers or authors delete workouts" on public.workout_programs;
create policy "Managers or authors delete workouts"
on public.workout_programs for delete to authenticated
using (
  account_id = public.current_platform_account_id()
  and (public.current_is_manager() or author_staff_id = public.current_staff_id())
);

grant select, insert, update, delete on public.workout_programs to authenticated;

-- ───────────────────────────── registro da equipe ──────────────────────────

alter table public.team_activity_log drop constraint if exists team_activity_log_entity_type_check;
alter table public.team_activity_log add constraint team_activity_log_entity_type_check
  check (entity_type in ('aluno', 'pagamento', 'plano', 'funcionario', 'unidade', 'tarefa', 'lead', 'treino'));

alter table public.team_activity_log drop constraint if exists team_activity_log_action_check;
alter table public.team_activity_log add constraint team_activity_log_action_check
  check (action in ('criou', 'editou', 'excluiu', 'recebeu', 'cancelou', 'inativou', 'reativou', 'concluiu', 'acesso', 'moveu', 'matriculou', 'perdeu'));

create or replace function public.lead_stage_label(p_stage text)
returns text
language sql
immutable
as $$
  select case p_stage
    when 'novo' then 'Novo contato'
    when 'contato' then 'Em conversa'
    when 'agendada' then 'Aula agendada'
    when 'experimental' then 'Aula feita'
    when 'matriculado' then 'Matriculado'
    when 'perdido' then 'Perdido'
    else p_stage
  end;
$$;

create or replace function public.tg_log_leads()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_team_log(new.account_id, 'lead', new.id, 'criou', 'Adicionou o interessado ' || new.full_name);
    insert into public.lead_events (account_id, lead_id, kind, body, metadata)
    values (new.account_id, new.id, 'etapa', 'Entrou no funil em ' || public.lead_stage_label(new.stage), jsonb_build_object('to', new.stage));
  elsif tg_op = 'DELETE' then
    perform public.write_team_log(old.account_id, 'lead', old.id, 'excluiu', 'Excluiu o interessado ' || old.full_name);
  elsif new.stage is distinct from old.stage then
    if new.stage = 'matriculado' then
      perform public.write_team_log(new.account_id, 'lead', new.id, 'matriculou', 'Matriculou ' || new.full_name);
    elsif new.stage = 'perdido' then
      perform public.write_team_log(new.account_id, 'lead', new.id, 'perdeu',
        'Marcou ' || new.full_name || ' como perdido', jsonb_build_object('motivo', new.lost_reason));
    else
      perform public.write_team_log(new.account_id, 'lead', new.id, 'moveu',
        'Moveu ' || new.full_name || ' para ' || public.lead_stage_label(new.stage));
    end if;
    insert into public.lead_events (account_id, lead_id, kind, body, metadata)
    values (new.account_id, new.id, 'etapa',
      public.lead_stage_label(old.stage) || ' → ' || public.lead_stage_label(new.stage),
      jsonb_build_object('from', old.stage, 'to', new.stage, 'motivo', new.lost_reason, 'obs', new.lost_notes));
  end if;
  return null;
end;
$$;

drop trigger if exists leads_team_log on public.leads;
create trigger leads_team_log
after insert or update or delete on public.leads
for each row execute function public.tg_log_leads();

create or replace function public.tg_log_workouts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.workout_programs;
  v_student text;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;
  select s.full_name into v_student from public.students s where s.id = v_row.student_id;
  v_student := coalesce(v_student, 'aluno removido');
  if tg_op = 'INSERT' then
    perform public.write_team_log(v_row.account_id, 'treino', v_row.id, 'criou',
      'Montou a ficha "' || v_row.title || '" para ' || v_student);
  elsif tg_op = 'DELETE' then
    perform public.write_team_log(v_row.account_id, 'treino', v_row.id, 'excluiu',
      'Excluiu a ficha "' || v_row.title || '" de ' || v_student);
  elsif (new.title, new.goal, new.level, new.notes, new.days, new.review_on, new.active)
        is distinct from (old.title, old.goal, old.level, old.notes, old.days, old.review_on, old.active) then
    perform public.write_team_log(v_row.account_id, 'treino', v_row.id, 'editou',
      case when new.active is distinct from old.active and not new.active
           then 'Arquivou a ficha "' || new.title || '" de ' || v_student
           else 'Atualizou a ficha "' || new.title || '" de ' || v_student end);
  end if;
  return null;
end;
$$;

drop trigger if exists workout_programs_team_log on public.workout_programs;
create trigger workout_programs_team_log
after insert or update or delete on public.workout_programs
for each row execute function public.tg_log_workouts();

revoke all on function public.tg_log_leads() from public, anon, authenticated;
revoke all on function public.tg_log_workouts() from public, anon, authenticated;
revoke all on function public.tg_lead_events_author() from public, anon, authenticated;
revoke all on function public.tg_workout_programs_author() from public, anon, authenticated;
