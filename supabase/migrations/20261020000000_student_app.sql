-- ============================================================================
-- musclePro · área do aluno no celular
--   • students.auth_user_id    login do aluno (criado pelo servidor)
--   • student_app_tokens       link pessoal enviado pelo WhatsApp
--   • workout_programs         rascunho → liberada ao aluno; visto pelo aluno
--   • workout_logs             treino feito, carga usada e comentário
--   • student_app_* (RPCs)     tudo o que o aluno lê e grava passa por aqui;
--                              o aluno não tem acesso direto a nenhuma tabela
-- ============================================================================

-- ───────────────────────────── login do aluno ──────────────────────────────

alter table public.students
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null,
  add column if not exists app_invited_at timestamptz,
  add column if not exists app_connected_at timestamptz,
  add column if not exists app_last_seen_at timestamptz;

-- O vínculo de login só muda pelo servidor (service role) ou pelas funções da
-- área do aluno, que marcam a sessão.
create or replace function public.tg_students_protect_app()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' or current_setting('musclepro.app_write', true) = '1' then
    return new;
  end if;
  new.auth_user_id := old.auth_user_id;
  new.app_invited_at := old.app_invited_at;
  new.app_connected_at := old.app_connected_at;
  new.app_last_seen_at := old.app_last_seen_at;
  return new;
end;
$$;

drop trigger if exists students_protect_app on public.students;
create trigger students_protect_app
before update on public.students
for each row execute function public.tg_students_protect_app();

create table if not exists public.student_app_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  failed_attempts integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists student_app_tokens_student_idx on public.student_app_tokens (student_id, created_at desc);
alter table public.student_app_tokens enable row level security;
-- Sem políticas: só o servidor (service role) lê e grava.

-- Aluno ativo dono da sessão atual (null para equipe e visitantes).
create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.students s
  join public.accounts a on a.id = s.account_id
  where s.auth_user_id = auth.uid()
    and s.status = 'ativo'
    and a.status = 'criada'
    and a.active = true
  limit 1;
$$;

grant execute on function public.current_student_id() to authenticated;

-- O registro da equipe identifica quando a ação veio do aluno pelo app.
create or replace function public.log_actor(p_account uuid, out actor_id uuid, out actor_name text, out actor_role text)
returns record
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
    select st.full_name, 'aluno' into actor_name, actor_role
    from public.students st where st.account_id = p_account and st.auth_user_id = actor_id;
  end if;
  if actor_name is null then
    actor_name := 'Sistema';
    actor_role := 'sistema';
  end if;
end;
$$;

-- ───────────────────────────── ficha: rascunho e liberação ─────────────────

alter table public.workout_programs
  add column if not exists published_at timestamptz,
  add column if not exists student_seen_at timestamptz;

-- Tudo o que já existia foi entregue ao aluno.
update public.workout_programs set published_at = coalesce(published_at, created_at);

-- Ativar = liberar ao aluno. Rascunho é a ficha nunca ativada.
create or replace function public.tg_workout_programs_cycle()
returns trigger
language plpgsql
as $$
begin
  if new.active and new.published_at is null then
    new.published_at := now();
  end if;
  if tg_op = 'UPDATE' and new.active is distinct from old.active then
    new.ended_on := case when new.active then null else coalesce(new.ended_on, current_date) end;
    if new.active then
      new.student_seen_at := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists workout_programs_cycle on public.workout_programs;
create trigger workout_programs_cycle
before insert or update on public.workout_programs
for each row execute function public.tg_workout_programs_cycle();

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
      case when v_row.active then 'Montou e liberou a ficha "' else 'Montou o rascunho da ficha "' end
      || v_row.title || '" para ' || v_student);
  elsif tg_op = 'DELETE' then
    perform public.write_team_log(v_row.account_id, 'treino', v_row.id, 'excluiu',
      'Excluiu a ficha "' || v_row.title || '" de ' || v_student);
  elsif new.active and not old.active and old.published_at is null then
    perform public.write_team_log(v_row.account_id, 'treino', v_row.id, 'editou',
      'Liberou a ficha "' || new.title || '" para ' || v_student);
  elsif (new.title, new.goal, new.level, new.notes, new.days, new.review_on, new.active)
        is distinct from (old.title, old.goal, old.level, old.notes, old.days, old.review_on, old.active) then
    perform public.write_team_log(v_row.account_id, 'treino', v_row.id, 'editou',
      case when new.active is distinct from old.active and not new.active
           then 'Arquivou a ficha "' || new.title || '" de ' || v_student
           when new.active is distinct from old.active and new.active
           then 'Reativou a ficha "' || new.title || '" de ' || v_student
           else 'Atualizou a ficha "' || new.title || '" de ' || v_student end);
  end if;
  return null;
end;
$$;

-- ───────────────────────────── treinos feitos ──────────────────────────────
-- exercises = [{ "name", "done": bool, "load": "62 kg" }]

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  workout_id uuid not null references public.workout_programs(id) on delete cascade,
  day_name text not null,
  performed_on date not null,
  exercises jsonb not null default '[]'::jsonb check (jsonb_typeof(exercises) = 'array'),
  comment text check (comment is null or length(comment) <= 1000),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_id, day_name, performed_on)
);

create index if not exists workout_logs_student_idx on public.workout_logs (student_id, performed_on desc);

drop trigger if exists workout_logs_set_updated_at on public.workout_logs;
create trigger workout_logs_set_updated_at
before update on public.workout_logs
for each row execute function public.tg_set_updated_at();

alter table public.workout_logs enable row level security;

drop policy if exists "Platform users read logs of visible students" on public.workout_logs;
create policy "Platform users read logs of visible students"
on public.workout_logs for select to authenticated
using (
  account_id = public.current_platform_account_id()
  and exists (select 1 from public.students s where s.id = student_id)
);

grant select on public.workout_logs to authenticated;

-- ───────────────────────────── funções da área do aluno ────────────────────

create or replace function public.student_app_home()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students;
  v_workout public.workout_programs;
  v_result jsonb;
begin
  select * into v_student from public.students where id = public.current_student_id();
  if not found then
    raise exception 'Acesso não encontrado ou suspenso. Fale com a recepção da academia.' using errcode = '42501';
  end if;

  perform set_config('musclepro.app_write', '1', true);
  update public.students
     set app_last_seen_at = now(),
         app_connected_at = coalesce(app_connected_at, now())
   where id = v_student.id;

  select * into v_workout from public.workout_programs
   where student_id = v_student.id and active and published_at is not null
   limit 1;
  if found and v_workout.student_seen_at is null then
    update public.workout_programs set student_seen_at = now() where id = v_workout.id;
  end if;

  select jsonb_build_object(
    'student', jsonb_build_object(
      'id', v_student.id,
      'fullName', v_student.full_name,
      'healthConditions', to_jsonb(v_student.health_conditions),
      'healthRestrictions', v_student.health_restrictions,
      'medicalNotes', v_student.medical_notes,
      'planName', (select p.name from public.plans p where p.id = v_student.plan_id)
    ),
    'account', (select jsonb_build_object('companyName', coalesce(a.company_name, 'Academia')) from public.accounts a where a.id = v_student.account_id),
    'workout', case when v_workout.id is null then null else jsonb_build_object(
      'id', v_workout.id,
      'title', v_workout.title,
      'goal', v_workout.goal,
      'notes', v_workout.notes,
      'days', v_workout.days,
      'startsOn', v_workout.starts_on,
      'reviewOn', v_workout.review_on,
      'cycleMonths', v_workout.cycle_months,
      'authorName', v_workout.author_name
    ) end,
    'logs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'workoutId', l.workout_id, 'dayName', l.day_name, 'performedOn', l.performed_on,
        'exercises', l.exercises, 'comment', l.comment, 'finishedAt', l.finished_at
      ) order by l.performed_on desc)
      from public.workout_logs l
      where l.student_id = v_student.id and l.performed_on >= current_date - 120
    ), '[]'::jsonb),
    'assessments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'kind', x.kind, 'measuredOn', x.measured_on, 'weightKg', x.weight_kg, 'heightCm', x.height_cm,
        'armCm', x.arm_cm, 'chestCm', x.chest_cm, 'waistCm', x.waist_cm, 'abdomenCm', x.abdomen_cm, 'thighCm', x.thigh_cm
      ) order by x.measured_on desc)
      from public.student_assessments x where x.student_id = v_student.id
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'amount', p.amount, 'dueAt', p.due_at, 'status', p.status, 'paidAt', p.paid_at, 'reference', p.reference_label
      ) order by p.due_at desc)
      from (
        select * from public.payments
         where student_id = v_student.id and status <> 'cancelado'
         order by due_at desc limit 8
      ) p
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- Salva o andamento (e a conclusão) do treino do dia.
create or replace function public.student_app_save_log(
  p_workout uuid,
  p_day text,
  p_exercises jsonb,
  p_comment text default null,
  p_finish boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students;
  v_workout public.workout_programs;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_log public.workout_logs;
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
begin
  select * into v_student from public.students where id = public.current_student_id();
  if not found then
    raise exception 'Acesso não encontrado ou suspenso.' using errcode = '42501';
  end if;
  select * into v_workout from public.workout_programs
   where id = p_workout and student_id = v_student.id and active and published_at is not null;
  if not found then
    raise exception 'Esta ficha não está mais em uso. Atualize a página.' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) > 60 then
    raise exception 'Registro inválido.' using errcode = '22023';
  end if;
  if v_comment is not null and length(v_comment) > 1000 then
    v_comment := left(v_comment, 1000);
  end if;

  insert into public.workout_logs (account_id, student_id, workout_id, day_name, performed_on, exercises, comment, finished_at)
  values (v_student.account_id, v_student.id, v_workout.id, left(p_day, 12), v_today, p_exercises, v_comment,
          case when p_finish then now() end)
  on conflict (workout_id, day_name, performed_on) do update
     set exercises = excluded.exercises,
         comment = coalesce(excluded.comment, public.workout_logs.comment),
         finished_at = coalesce(public.workout_logs.finished_at, excluded.finished_at)
  returning * into v_log;

  -- Comentário ao concluir chega na agenda de quem montou a ficha.
  if p_finish and v_comment is not null then
    insert into public.tasks (account_id, student_id, staff_id, title, description, due_at, priority)
    values (v_student.account_id, v_student.id, v_workout.author_staff_id,
            'Comentário de ' || v_student.full_name || ' no treino ' || p_day,
            v_comment, now(), 'media');
    insert into public.student_activities (account_id, student_id, kind, title, body, metadata)
    values (v_student.account_id, v_student.id, 'nota', 'Comentário no treino ' || p_day || ' (pelo app)', v_comment,
            jsonb_build_object('source', 'app', 'workoutId', v_workout.id));
  end if;

  return jsonb_build_object(
    'id', v_log.id, 'workoutId', v_log.workout_id, 'dayName', v_log.day_name, 'performedOn', v_log.performed_on,
    'exercises', v_log.exercises, 'comment', v_log.comment, 'finishedAt', v_log.finished_at
  );
end;
$$;

-- "Algo mudou na minha saúde": tarefa urgente para o professor.
create or replace function public.student_app_report_health(p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students;
  v_author uuid;
  v_message text := nullif(trim(coalesce(p_message, '')), '');
begin
  select * into v_student from public.students where id = public.current_student_id();
  if not found then
    raise exception 'Acesso não encontrado ou suspenso.' using errcode = '42501';
  end if;
  if v_message is null then
    raise exception 'Conte o que mudou.' using errcode = '22023';
  end if;
  if (select count(*) from public.student_activities
       where student_id = v_student.id and metadata->>'source' = 'app_health'
         and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Você já enviou vários avisos hoje. Fale com a recepção.' using errcode = 'P0001';
  end if;

  select author_staff_id into v_author from public.workout_programs
   where student_id = v_student.id and active limit 1;

  insert into public.tasks (account_id, student_id, staff_id, title, description, due_at, priority)
  values (v_student.account_id, v_student.id, v_author,
          'Saúde: ' || v_student.full_name || ' relatou uma mudança',
          left(v_message, 1000) || E'\n\nRevise as restrições do aluno e a ficha de treino.', now(), 'alta');
  insert into public.student_activities (account_id, student_id, kind, title, body, metadata)
  values (v_student.account_id, v_student.id, 'contato', 'Aluno relatou mudança na saúde (pelo app)', left(v_message, 1000),
          jsonb_build_object('source', 'app_health'));
end;
$$;

revoke all on function public.student_app_home() from public, anon;
revoke all on function public.student_app_save_log(uuid, text, jsonb, text, boolean) from public, anon;
revoke all on function public.student_app_report_health(text) from public, anon;
grant execute on function public.student_app_home() to authenticated;
grant execute on function public.student_app_save_log(uuid, text, jsonb, text, boolean) to authenticated;
grant execute on function public.student_app_report_health(text) to authenticated;
