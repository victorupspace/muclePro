-- Treinos padrão e cardio.
--   * workout_templates: fichas-modelo da academia, sem aluno, que podem ser
--     aplicadas a qualquer aluno (viram uma ficha personalizada).
--   * account_settings.cardio_equipment: aparelhos de cardio que a academia
--     tem, usados no bloco de cardio de cada treino.
-- O cardio fica dentro de days (jsonb) de cada ficha: { equipment, minutes,
-- intensity, notes } em days[].cardio.

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  author_staff_id uuid references public.staff(id) on delete set null,
  author_name text,
  title text not null check (length(trim(title)) > 0),
  goal text,
  level text check (level is null or level in ('iniciante', 'intermediario', 'avancado')),
  cycle_months integer check (cycle_months is null or cycle_months between 1 and 24),
  notes text,
  days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_templates_account_idx on public.workout_templates (account_id, title);

drop trigger if exists workout_templates_set_updated_at on public.workout_templates;
create trigger workout_templates_set_updated_at
before update on public.workout_templates
for each row execute function public.tg_set_updated_at();

create or replace function public.tg_workout_templates_author()
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

drop trigger if exists workout_templates_author on public.workout_templates;
create trigger workout_templates_author
before insert on public.workout_templates
for each row execute function public.tg_workout_templates_author();

-- Modo leitura (assinatura em atraso) vale aqui também.
drop trigger if exists workout_templates_enforce_writable on public.workout_templates;
create trigger workout_templates_enforce_writable
before insert or update or delete on public.workout_templates
for each row execute function public.tg_enforce_account_writable();

alter table public.workout_templates enable row level security;

drop policy if exists "Platform users read workout templates" on public.workout_templates;
create policy "Platform users read workout templates"
on public.workout_templates for select to authenticated
using (account_id = public.current_platform_account_id());

drop policy if exists "Trainers create workout templates" on public.workout_templates;
create policy "Trainers create workout templates"
on public.workout_templates for insert to authenticated
with check (account_id = public.current_platform_account_id() and public.current_can('workouts'));

drop policy if exists "Trainers update workout templates" on public.workout_templates;
create policy "Trainers update workout templates"
on public.workout_templates for update to authenticated
using (account_id = public.current_platform_account_id() and public.current_can('workouts'))
with check (account_id = public.current_platform_account_id() and public.current_can('workouts'));

drop policy if exists "Managers or authors delete workout templates" on public.workout_templates;
create policy "Managers or authors delete workout templates"
on public.workout_templates for delete to authenticated
using (
  account_id = public.current_platform_account_id()
  and (public.current_is_manager() or author_staff_id = public.current_staff_id())
);

alter table public.account_settings
  add column if not exists cardio_equipment text[];
