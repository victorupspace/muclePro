-- Tarefas concluídas somem sozinhas 7 dias depois de concluídas.
-- Roda uma vez por dia pelo cron do servidor (service role). A limpeza
-- automática não entra no registro da equipe: ninguém excluiu nada.

create index if not exists tasks_done_at_idx on public.tasks (done_at) where done;

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
    if coalesce(current_setting('musclepro.purging_tasks', true), '') = 'on' then
      return null;
    end if;
    perform public.write_team_log(old.account_id, 'tarefa', old.id, 'excluiu', 'Excluiu a tarefa "' || old.title || '"');
  elsif new.done is distinct from old.done and new.done then
    perform public.write_team_log(new.account_id, 'tarefa', new.id, 'concluiu', 'Concluiu a tarefa "' || new.title || '"');
  end if;
  return null;
end;
$$;

create or replace function public.purge_done_tasks(p_days integer default 7)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform set_config('musclepro.purging_tasks', 'on', true);
  delete from public.tasks
   where done
     and done_at is not null
     and done_at < now() - make_interval(days => p_days);
  get diagnostics v_count = row_count;
  perform set_config('musclepro.purging_tasks', 'off', true);
  return v_count;
end;
$$;

revoke all on function public.purge_done_tasks(integer) from public, anon, authenticated;
grant execute on function public.purge_done_tasks(integer) to service_role;
