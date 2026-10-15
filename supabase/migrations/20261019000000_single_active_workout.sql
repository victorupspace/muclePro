-- ============================================================================
-- musclePro · uma ficha ativa por aluno
-- Criar ou reativar uma ficha arquiva a que estava em uso. A regra vive no
-- banco: vale para qualquer tela e o índice impede duas fichas ativas.
-- ============================================================================

-- Arquiva a ficha em uso antes de gravar a nova (ou a reativada). Os gatilhos
-- da ficha arquivada também rodam: ela ganha data de término e o lembrete de
-- renovação dela é concluído.
create or replace function public.tg_workout_programs_single_active()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.active and (tg_op = 'INSERT' or not old.active or new.student_id is distinct from old.student_id) then
    update public.workout_programs
       set active = false
     where student_id = new.student_id
       and active
       and id <> new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.tg_workout_programs_single_active() from public, anon, authenticated;

drop trigger if exists workout_programs_single_active on public.workout_programs;
create trigger workout_programs_single_active
before insert or update of active, student_id on public.workout_programs
for each row execute function public.tg_workout_programs_single_active();

create unique index if not exists workout_programs_one_active_idx
  on public.workout_programs (student_id)
  where active;
