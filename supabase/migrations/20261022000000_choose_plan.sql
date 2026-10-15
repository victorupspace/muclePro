-- ============================================================================
-- musclePro · a academia escolhe o próprio plano durante o teste grátis
-- Só o dono da conta, só planos ativos com valor definido e só antes do
-- primeiro pagamento (depois disso, a troca é feita pela equipe musclePro).
-- ============================================================================

create or replace function public.choose_subscription_plan(p_plan uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid := public.current_platform_account_id();
  a public.accounts;
  p public.subscription_plans;
  v_actor text;
begin
  if v_account is null or not public.current_is_account_owner() then
    raise exception 'Só o responsável pela conta escolhe o plano.' using errcode = '42501';
  end if;
  select * into p from public.subscription_plans where id = p_plan and active and price is not null;
  if not found then
    raise exception 'Este plano não está disponível agora.' using errcode = 'P0002';
  end if;
  select * into a from public.accounts where id = v_account;
  if exists (select 1 from public.account_invoices where account_id = v_account and status = 'paga') then
    raise exception 'Para trocar de plano, fale com a equipe musclePro.' using errcode = 'P0001';
  end if;

  -- A cobrança começa no fim do teste (mesmo que ele já tenha acabado):
  -- escolher um plano não ganha dias extras.
  update public.accounts
     set plan_id = p.id,
         custom_price = null,
         subscription_started_at = coalesce(trial_ends_at, now())
   where id = v_account;

  select email into v_actor from auth.users where id = auth.uid();
  insert into public.audit_events (resource_type, resource_id, label, actor_id, actor_label)
  values ('account', v_account, 'Plano ' || p.name || ' escolhido pela academia', auth.uid(), coalesce(v_actor, 'academia'));

  return jsonb_build_object('planName', p.name, 'price', p.price, 'months', p.months, 'startsOn', (coalesce(a.trial_ends_at, now()) at time zone 'America/Sao_Paulo')::date);
end;
$$;

revoke all on function public.choose_subscription_plan(uuid) from public, anon;
grant execute on function public.choose_subscription_plan(uuid) to authenticated;
