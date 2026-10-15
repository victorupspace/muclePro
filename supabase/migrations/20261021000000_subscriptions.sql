-- ============================================================================
-- musclePro · assinatura das academias
--   • subscription_plans     catálogo (mensal, trimestral, semestral, anual)
--   • accounts.*             plano, preço negociado, fim do trial, carência
--   • account_invoices       uma fatura por período; baixa manual por enquanto
--                            (gateway_* fica pronto para o Asaas)
--   • modo leitura           vencida a carência, a academia só consulta: nada
--                            é apagado, mas cadastros e edições ficam travados
-- ============================================================================

create or replace function public.today_brt()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- ───────────────────────────── planos ──────────────────────────────────────

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  interval text not null unique check (interval in ('mensal', 'trimestral', 'semestral', 'anual')),
  months integer not null check (months in (1, 3, 6, 12)),
  price numeric(12,2) check (price is null or price >= 0),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists subscription_plans_set_updated_at on public.subscription_plans;
create trigger subscription_plans_set_updated_at
before update on public.subscription_plans
for each row execute function public.tg_set_updated_at();

insert into public.subscription_plans (name, interval, months) values
  ('Mensal', 'mensal', 1),
  ('Trimestral', 'trimestral', 3),
  ('Semestral', 'semestral', 6),
  ('Anual', 'anual', 12)
on conflict (interval) do nothing;

alter table public.subscription_plans enable row level security;

drop policy if exists "Admins manage subscription plans" on public.subscription_plans;
create policy "Admins manage subscription plans"
on public.subscription_plans for all to authenticated
using (public.is_musclepro_admin())
with check (public.is_musclepro_admin());

drop policy if exists "Platform users read subscription plans" on public.subscription_plans;
create policy "Platform users read subscription plans"
on public.subscription_plans for select to authenticated
using (public.current_platform_account_id() is not null);

grant select, insert, update on public.subscription_plans to authenticated;

-- ───────────────────────────── assinatura da conta ─────────────────────────

alter table public.accounts
  add column if not exists plan_id uuid references public.subscription_plans(id) on delete set null,
  add column if not exists custom_price numeric(12,2) check (custom_price is null or custom_price >= 0),
  add column if not exists trial_ends_at timestamptz,
  add column if not exists grace_days integer not null default 5 check (grace_days between 0 and 60),
  add column if not exists subscription_started_at timestamptz,
  add column if not exists canceled_at timestamptz;

-- Contas aprovadas antes desta regra: 14 dias de teste a partir da aprovação.
update public.accounts
   set trial_ends_at = coalesce(approved_at, created_at) + interval '14 days'
 where status = 'criada' and trial_ends_at is null;

-- ───────────────────────────── faturas ─────────────────────────────────────

create table if not exists public.account_invoices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  plan_name text,
  period_start date not null,
  period_end date not null,
  due_on date not null,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'aberta' check (status in ('aberta', 'paga', 'cancelada')),
  paid_at timestamptz,
  paid_amount numeric(12,2),
  method text check (method is null or method in ('pix', 'boleto', 'cartao', 'transferencia', 'outro')),
  notes text,
  gateway text,
  gateway_id text,
  gateway_url text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_invoices_account_idx on public.account_invoices (account_id, period_start desc);
create unique index if not exists account_invoices_period_idx
  on public.account_invoices (account_id, period_start)
  where status <> 'cancelada';

drop trigger if exists account_invoices_set_updated_at on public.account_invoices;
create trigger account_invoices_set_updated_at
before update on public.account_invoices
for each row execute function public.tg_set_updated_at();

alter table public.account_invoices enable row level security;

drop policy if exists "Admins manage invoices" on public.account_invoices;
create policy "Admins manage invoices"
on public.account_invoices for all to authenticated
using (public.is_musclepro_admin())
with check (public.is_musclepro_admin());

drop policy if exists "Account managers read own invoices" on public.account_invoices;
create policy "Account managers read own invoices"
on public.account_invoices for select to authenticated
using (account_id = public.current_platform_account_id() and public.current_is_manager());

grant select, insert, update on public.account_invoices to authenticated;

-- ───────────────────────────── regras ──────────────────────────────────────

-- Modo leitura: assinatura cancelada, fatura vencida além da carência, ou
-- teste encerrado (mais a carência) sem plano e sem nenhum pagamento.
create or replace function public.account_read_only(p_account uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      a.canceled_at is not null
      or exists (
        select 1 from public.account_invoices i
        where i.account_id = a.id and i.status = 'aberta' and i.due_on + a.grace_days < public.today_brt()
      )
      or (
        a.plan_id is null
        and a.trial_ends_at is not null
        and (a.trial_ends_at at time zone 'America/Sao_Paulo')::date + a.grace_days < public.today_brt()
        and not exists (select 1 from public.account_invoices i where i.account_id = a.id and i.status = 'paga')
      )
    from public.accounts a
    where a.id = p_account and a.status = 'criada'
  ), false);
$$;

grant execute on function public.account_read_only(uuid) to authenticated;

-- Situação exibida (accounts.payment_*), recalculada a partir das faturas.
create or replace function public.update_account_billing_status(p_account uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  p public.subscription_plans;
  v_today date := public.today_brt();
  v_status text;
  v_next date;
  v_last timestamptz;
  v_paid_any boolean;
begin
  select * into a from public.accounts where id = p_account;
  if not found or a.status <> 'criada' then
    return;
  end if;
  select * into p from public.subscription_plans where id = a.plan_id;

  select min(due_on) into v_next from public.account_invoices where account_id = a.id and status = 'aberta';
  select max(paid_at) into v_last from public.account_invoices where account_id = a.id and status = 'paga';
  v_paid_any := v_last is not null;

  v_status := case
    when a.canceled_at is not null then 'cancelado'
    when v_next is not null and v_next < v_today then 'atrasado'
    when a.trial_ends_at is not null and a.trial_ends_at > now() and not v_paid_any then 'trial'
    when v_next is not null then 'pendente'
    when not v_paid_any then 'pendente'
    else 'em_dia'
  end;

  update public.accounts
     set payment_status = v_status,
         payment_plan = p.name,
         payment_monthly_amount = case when p.id is null then null
                                       else round(coalesce(a.custom_price, p.price) / p.months, 2) end,
         payment_next_due_at = v_next,
         payment_last_paid_at = v_last
   where id = a.id;
end;
$$;

-- Gera as faturas que vencem nos próximos 10 dias (e as que ficaram para trás).
create or replace function public.generate_account_invoices(p_account uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  p public.subscription_plans;
  v_price numeric;
  v_start date;
  v_end date;
  v_count integer := 0;
begin
  select * into a from public.accounts where id = p_account;
  if not found or a.status <> 'criada' or a.canceled_at is not null or a.plan_id is null then
    return 0;
  end if;
  select * into p from public.subscription_plans where id = a.plan_id;
  v_price := coalesce(a.custom_price, p.price);
  if v_price is null then
    return 0;
  end if;

  select max(period_end) + 1 into v_start from public.account_invoices
   where account_id = a.id and status <> 'cancelada';
  if v_start is null then
    v_start := greatest(
      coalesce((a.trial_ends_at at time zone 'America/Sao_Paulo')::date, public.today_brt()),
      coalesce((a.subscription_started_at at time zone 'America/Sao_Paulo')::date, public.today_brt())
    );
  end if;

  while v_start <= public.today_brt() + 10 and v_count < 24 loop
    v_end := (v_start + make_interval(months => p.months))::date - 1;
    insert into public.account_invoices (account_id, plan_id, plan_name, period_start, period_end, due_on, amount, created_by)
    values (a.id, p.id, p.name, v_start, v_end, v_start, v_price, null);
    v_count := v_count + 1;
    v_start := v_end + 1;
  end loop;
  return v_count;
end;
$$;

-- Gerar + recalcular. Admin para qualquer conta; a academia só para a própria.
create or replace function public.refresh_account_billing(p_account uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (auth.role() = 'service_role' or auth.uid() is null or public.is_musclepro_admin()
          or p_account = public.current_platform_account_id()) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  perform public.generate_account_invoices(p_account);
  perform public.update_account_billing_status(p_account);
end;
$$;

create or replace function public.refresh_all_billing()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
begin
  if not (auth.role() = 'service_role' or auth.uid() is null or public.is_musclepro_admin()) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  for r in select id from public.accounts where status = 'criada' loop
    perform public.generate_account_invoices(r.id);
    perform public.update_account_billing_status(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.update_account_billing_status(uuid) from public, anon, authenticated;
revoke all on function public.generate_account_invoices(uuid) from public, anon, authenticated;
grant execute on function public.refresh_account_billing(uuid) to authenticated;
grant execute on function public.refresh_all_billing() to authenticated;

-- Mudou plano ou preço: as faturas em aberto são refeitas com o novo valor.
create or replace function public.tg_accounts_billing_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'criada' then
    return null;
  end if;
  if new.plan_id is distinct from old.plan_id or new.custom_price is distinct from old.custom_price then
    update public.account_invoices set status = 'cancelada', notes = coalesce(notes || ' · ', '') || 'Substituída pela troca de plano/valor'
     where account_id = new.id and status = 'aberta';
  end if;
  if new.canceled_at is not null and old.canceled_at is null then
    update public.account_invoices set status = 'cancelada', notes = coalesce(notes || ' · ', '') || 'Assinatura cancelada'
     where account_id = new.id and status = 'aberta' and period_start > public.today_brt();
  end if;
  perform public.generate_account_invoices(new.id);
  perform public.update_account_billing_status(new.id);
  return null;
end;
$$;

drop trigger if exists accounts_billing_changed on public.accounts;
create trigger accounts_billing_changed
after update of plan_id, custom_price, trial_ends_at, grace_days, canceled_at, status on public.accounts
for each row execute function public.tg_accounts_billing_changed();

create or replace function public.tg_invoices_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.update_account_billing_status(coalesce(new.account_id, old.account_id));
  return null;
end;
$$;

drop trigger if exists account_invoices_changed on public.account_invoices;
create trigger account_invoices_changed
after insert or update or delete on public.account_invoices
for each row execute function public.tg_invoices_changed();

-- O que a academia vê da própria assinatura (e o modo leitura).
create or replace function public.current_account_billing()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid := public.current_platform_account_id();
  a public.accounts;
  p public.subscription_plans;
  v_overdue date;
begin
  if v_account is null then
    return null;
  end if;
  perform public.generate_account_invoices(v_account);
  perform public.update_account_billing_status(v_account);
  select * into a from public.accounts where id = v_account;
  select * into p from public.subscription_plans where id = a.plan_id;
  select min(due_on) into v_overdue from public.account_invoices
   where account_id = v_account and status = 'aberta' and due_on < public.today_brt();

  return jsonb_build_object(
    'status', a.payment_status,
    'readOnly', public.account_read_only(v_account),
    'trialEndsAt', a.trial_ends_at,
    'graceDays', a.grace_days,
    'planName', p.name,
    'planMonths', p.months,
    'price', coalesce(a.custom_price, p.price),
    'nextDueOn', a.payment_next_due_at,
    'overdueSince', v_overdue,
    'canceledAt', a.canceled_at,
    'invoices', case when public.current_is_manager() then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'planName', i.plan_name, 'periodStart', i.period_start, 'periodEnd', i.period_end,
        'dueOn', i.due_on, 'amount', i.amount, 'status', i.status, 'paidAt', i.paid_at, 'gatewayUrl', i.gateway_url
      ) order by i.period_start desc)
      from (select * from public.account_invoices where account_id = v_account and status <> 'cancelada' order by period_start desc limit 24) i
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

grant execute on function public.current_account_billing() to authenticated;

-- ───────────────────────────── modo leitura no banco ───────────────────────
-- Vale para dono e equipe. O servidor (service role), o aluno pela área do
-- aluno e as rotinas internas continuam funcionando.

create or replace function public.tg_enforce_account_writable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid;
begin
  if auth.role() = 'service_role' or auth.uid() is null or public.current_student_id() is not null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  v_account := case when tg_op = 'DELETE' then old.account_id else new.account_id end;
  if public.account_read_only(v_account) then
    raise exception 'Assinatura em atraso: o sistema está em modo leitura. Regularize o pagamento para voltar a cadastrar e editar.'
      using errcode = 'MP402';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'students', 'payments', 'plans', 'staff', 'units', 'tasks', 'student_activities', 'leads',
    'lead_events', 'workout_programs', 'student_assessments', 'account_settings'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_enforce_writable', t);
    execute format(
      'create trigger %I before insert or update or delete on public.%I for each row execute function public.tg_enforce_account_writable()',
      t || '_enforce_writable', t
    );
  end loop;
end $$;

-- Dados da empresa (feito pela própria academia) também ficam travados.
create or replace function public.tg_accounts_enforce_writable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or auth.uid() is null or public.is_musclepro_admin() then
    return new;
  end if;
  if public.account_read_only(new.id)
     and (new.company_name, new.document, new.address, new.contact_phone, new.contact_email, new.business_type)
         is distinct from (old.company_name, old.document, old.address, old.contact_phone, old.contact_email, old.business_type) then
    raise exception 'Assinatura em atraso: o sistema está em modo leitura. Regularize o pagamento para voltar a cadastrar e editar.'
      using errcode = 'MP402';
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_enforce_writable on public.accounts;
create trigger accounts_enforce_writable
before update on public.accounts
for each row execute function public.tg_accounts_enforce_writable();

select public.refresh_all_billing();

-- Novo valor no catálogo: refaz as faturas em aberto de quem paga o valor do plano.
create or replace function public.tg_subscription_plans_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.price is not distinct from old.price then
    return null;
  end if;
  for r in select id from public.accounts where plan_id = new.id and custom_price is null and status = 'criada' loop
    update public.account_invoices
       set status = 'cancelada', notes = coalesce(notes || ' · ', '') || 'Substituída pelo novo valor do plano'
     where account_id = r.id and status = 'aberta';
    perform public.generate_account_invoices(r.id);
    perform public.update_account_billing_status(r.id);
  end loop;
  return null;
end;
$$;

drop trigger if exists subscription_plans_price on public.subscription_plans;
create trigger subscription_plans_price
after update of price on public.subscription_plans
for each row execute function public.tg_subscription_plans_price();
