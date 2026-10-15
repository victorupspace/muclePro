-- ============================================================================
-- musclePro · saúde, avaliações físicas e ciclos de treino
--   • students.health_*       condições de saúde e restrições para o treino
--   • student_assessments     anamnese inicial e reavaliações (peso, medidas)
--   • workout_programs        ciclo (recorrência em meses) e data de término
--   • tasks.workout_id        lembrete de renovação na agenda de quem montou a
--                             ficha, mantido pelo banco
-- ============================================================================

-- ───────────────────────────── saúde do aluno ──────────────────────────────

alter table public.students
  add column if not exists health_conditions text[] not null default '{}',
  add column if not exists health_restrictions text;

-- Quem cuida do treino (personal) também precisa registrar uma restrição que
-- descobriu, mesmo sem permissão de editar o cadastro.
create or replace function public.update_student_health(
  p_student uuid,
  p_conditions text[],
  p_restrictions text,
  p_medical_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid := public.current_platform_account_id();
  v_unit uuid;
begin
  if not (public.current_can('workouts') or public.current_can('register_students')) then
    raise exception 'Sem permissão para alterar dados de saúde.' using errcode = '42501';
  end if;
  select unit_id into v_unit from public.students where id = p_student and account_id = v_account;
  if not found then
    raise exception 'Aluno não encontrado.' using errcode = 'P0002';
  end if;
  if public.current_unit_scope() is not null and v_unit is not null and v_unit <> public.current_unit_scope() then
    raise exception 'Aluno de outra unidade.' using errcode = '42501';
  end if;
  update public.students
     set health_conditions = coalesce(p_conditions, '{}'),
         health_restrictions = nullif(trim(p_restrictions), ''),
         medical_notes = nullif(trim(p_medical_notes), '')
   where id = p_student;
end;
$$;

grant execute on function public.update_student_health(uuid, text[], text, text) to authenticated;

-- ───────────────────────────── avaliações físicas ──────────────────────────

create table if not exists public.student_assessments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  kind text not null default 'reavaliacao' check (kind in ('inicial', 'reavaliacao')),
  measured_on date not null default current_date,
  weight_kg numeric(5,2) check (weight_kg is null or weight_kg between 10 and 400),
  height_cm numeric(5,1) check (height_cm is null or height_cm between 50 and 250),
  arm_cm numeric(5,1) check (arm_cm is null or arm_cm between 5 and 100),
  chest_cm numeric(5,1) check (chest_cm is null or chest_cm between 30 and 250),
  waist_cm numeric(5,1) check (waist_cm is null or waist_cm between 30 and 250),
  abdomen_cm numeric(5,1) check (abdomen_cm is null or abdomen_cm between 30 and 250),
  thigh_cm numeric(5,1) check (thigh_cm is null or thigh_cm between 10 and 150),
  notes text,
  author_staff_id uuid references public.staff(id) on delete set null,
  author_name text,
  created_at timestamptz not null default now()
);

create index if not exists student_assessments_student_idx on public.student_assessments (student_id, measured_on desc);

create or replace function public.tg_assessments_author()
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

drop trigger if exists student_assessments_author on public.student_assessments;
create trigger student_assessments_author
before insert on public.student_assessments
for each row execute function public.tg_assessments_author();

alter table public.student_assessments enable row level security;

drop policy if exists "Platform users read assessments of visible students" on public.student_assessments;
create policy "Platform users read assessments of visible students"
on public.student_assessments for select to authenticated
using (
  account_id = public.current_platform_account_id()
  and exists (select 1 from public.students s where s.id = student_id)
);

drop policy if exists "Allowed staff write assessments" on public.student_assessments;
create policy "Allowed staff write assessments"
on public.student_assessments for insert to authenticated
with check (
  account_id = public.current_platform_account_id()
  and (public.current_can('workouts') or public.current_can('register_students'))
  and exists (select 1 from public.students s where s.id = student_id)
);

drop policy if exists "Allowed staff update assessments" on public.student_assessments;
create policy "Allowed staff update assessments"
on public.student_assessments for update to authenticated
using (
  account_id = public.current_platform_account_id()
  and (public.current_can('workouts') or public.current_can('register_students'))
  and exists (select 1 from public.students s where s.id = student_id)
)
with check (account_id = public.current_platform_account_id());

drop policy if exists "Managers or authors delete assessments" on public.student_assessments;
create policy "Managers or authors delete assessments"
on public.student_assessments for delete to authenticated
using (
  account_id = public.current_platform_account_id()
  and (public.current_is_manager() or author_staff_id = public.current_staff_id())
);

grant select, insert, update, delete on public.student_assessments to authenticated;

-- ───────────────────────────── ciclos de treino ────────────────────────────

alter table public.workout_programs
  add column if not exists cycle_months integer check (cycle_months is null or cycle_months between 1 and 24),
  add column if not exists ended_on date;

-- Arquivar fecha o ciclo; reativar reabre.
create or replace function public.tg_workout_programs_cycle()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.active is distinct from old.active then
    new.ended_on := case when new.active then null else coalesce(new.ended_on, current_date) end;
  end if;
  return new;
end;
$$;

drop trigger if exists workout_programs_cycle on public.workout_programs;
create trigger workout_programs_cycle
before update on public.workout_programs
for each row execute function public.tg_workout_programs_cycle();

update public.workout_programs set ended_on = coalesce(ended_on, updated_at::date) where not active;

-- ───────────────────────────── lembrete de renovação ───────────────────────

alter table public.tasks
  add column if not exists workout_id uuid references public.workout_programs(id) on delete cascade;

create index if not exists tasks_workout_idx on public.tasks (workout_id) where workout_id is not null;

-- Uma tarefa aberta por ficha, na agenda de quem montou, uma semana antes do
-- vencimento do ciclo. Ficha arquivada ou sem vencimento: o lembrete sai da agenda.
create or replace function public.sync_workout_reminder(p_workout uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.workout_programs;
  v_student text;
  v_due timestamptz;
  v_title text;
  v_desc text;
begin
  select * into w from public.workout_programs where id = p_workout;
  if not found then
    return;
  end if;

  if not w.active or w.review_on is null then
    update public.tasks set done = true, done_at = coalesce(done_at, now())
     where workout_id = w.id and not done;
    return;
  end if;

  select full_name into v_student from public.students where id = w.student_id;
  v_due := ((w.review_on - 7)::timestamp + time '09:00') at time zone 'America/Sao_Paulo';
  v_title := 'Renovar ciclo de treino de ' || coalesce(v_student, 'aluno');
  v_desc := 'A ficha "' || w.title || '" vence em ' || to_char(w.review_on, 'DD/MM/YYYY')
    || '. Reavalie o aluno e monte o próximo ciclo.';

  update public.tasks
     set title = v_title, description = v_desc, due_at = v_due, staff_id = w.author_staff_id, student_id = w.student_id
   where workout_id = w.id and not done;
  if not found then
    insert into public.tasks (account_id, student_id, staff_id, title, description, due_at, priority, workout_id)
    values (w.account_id, w.student_id, w.author_staff_id, v_title, v_desc, v_due, 'media', w.id);
  end if;
end;
$$;

revoke all on function public.sync_workout_reminder(uuid) from public, anon, authenticated;

create or replace function public.tg_workout_programs_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.active is distinct from old.active
     or new.review_on is distinct from old.review_on
     or new.title is distinct from old.title then
    perform public.sync_workout_reminder(new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists workout_programs_reminder on public.workout_programs;
create trigger workout_programs_reminder
after insert or update on public.workout_programs
for each row execute function public.tg_workout_programs_reminder();

revoke all on function public.tg_workout_programs_reminder() from public, anon, authenticated;

-- Fichas que já existem ganham o lembrete.
do $$
declare r record;
begin
  for r in select id from public.workout_programs where active and review_on is not null loop
    perform public.sync_workout_reminder(r.id);
  end loop;
end $$;

-- ───────────────────────────── registro da equipe ──────────────────────────

alter table public.team_activity_log drop constraint if exists team_activity_log_entity_type_check;
alter table public.team_activity_log add constraint team_activity_log_entity_type_check
  check (entity_type in ('aluno', 'pagamento', 'plano', 'funcionario', 'unidade', 'tarefa', 'lead', 'treino', 'avaliacao'));

create or replace function public.tg_log_assessments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.student_assessments;
  v_student text;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;
  select full_name into v_student from public.students where id = v_row.student_id;
  v_student := coalesce(v_student, 'aluno removido');
  if tg_op = 'INSERT' then
    perform public.write_team_log(v_row.account_id, 'avaliacao', v_row.id, 'criou',
      case when v_row.kind = 'inicial' then 'Registrou a anamnese inicial de ' else 'Registrou reavaliação física de ' end || v_student);
  elsif tg_op = 'DELETE' then
    perform public.write_team_log(v_row.account_id, 'avaliacao', v_row.id, 'excluiu', 'Excluiu uma avaliação física de ' || v_student);
  else
    perform public.write_team_log(v_row.account_id, 'avaliacao', v_row.id, 'editou', 'Corrigiu uma avaliação física de ' || v_student);
  end if;
  return null;
end;
$$;

drop trigger if exists student_assessments_team_log on public.student_assessments;
create trigger student_assessments_team_log
after insert or update or delete on public.student_assessments
for each row execute function public.tg_log_assessments();

revoke all on function public.tg_log_assessments() from public, anon, authenticated;
revoke all on function public.tg_assessments_author() from public, anon, authenticated;
