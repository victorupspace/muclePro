-- ============================================================================
-- Login de funcionários com permissões aplicadas no banco.
--
--   • staff ganha o estado do acesso (convidado em / aceito em)
--   • password_setup_tokens passa a servir também a convites de funcionário
--   • funções que descrevem o usuário logado (dono, gestor, alçadas, unidade)
--   • políticas de RLS por ação, substituindo o "tudo liberado por conta"
--
-- Regras:
--   dono da conta e perfil "gestao"  → tudo, menos editar os dados da empresa
--                                      (só o dono, via update_company_profile)
--   can_register_students            → cadastrar e editar alunos
--   can_send_payment_links           → cobranças: criar, receber, cancelar
--   funcionário com unidade          → só enxerga alunos da própria unidade
--                                      (e os sem unidade)
-- ============================================================================

alter table public.staff
  add column if not exists access_invited_at timestamptz,
  add column if not exists access_accepted_at timestamptz;

alter table public.password_setup_tokens
  add column if not exists staff_id uuid references public.staff(id) on delete cascade;

create index if not exists password_setup_tokens_staff_idx
  on public.password_setup_tokens (staff_id, created_at desc);

-- ───────────────────────────── quem é o usuário logado ─────────────────────

create or replace function public.current_is_account_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.accounts a
    where a.auth_user_id = auth.uid()
      and a.status = 'criada'
      and a.active = true
  );
$$;

-- Funcionário ativo com login, numa conta ativa.
create or replace function public.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.staff s
  join public.accounts a on a.id = s.account_id
  where s.auth_user_id = auth.uid()
    and s.active = true
    and a.status = 'criada'
    and a.active = true
  limit 1;
$$;

create or replace function public.current_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_is_account_owner()
    or exists (
      select 1 from public.staff s
      where s.id = public.current_staff_id() and s.role = 'gestao'
    );
$$;

-- p_permission: 'register_students' | 'payments' | 'workouts'
create or replace function public.current_can(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.current_is_manager() then true
    else coalesce((
      select case p_permission
        when 'register_students' then s.can_register_students
        when 'payments' then s.can_send_payment_links
        when 'workouts' then s.can_create_workouts
        else false
      end
      from public.staff s
      where s.id = public.current_staff_id()
    ), false)
  end;
$$;

-- Unidade que limita o que o usuário enxerga (null = sem limite).
create or replace function public.current_unit_scope()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.current_is_manager() then null
    else (select s.unit_id from public.staff s where s.id = public.current_staff_id())
  end;
$$;

grant execute on function public.current_is_account_owner() to authenticated;
grant execute on function public.current_staff_id() to authenticated;
grant execute on function public.current_is_manager() to authenticated;
grant execute on function public.current_can(text) to authenticated;
grant execute on function public.current_unit_scope() to authenticated;

-- ───────────────────────────── proteção do vínculo de login ────────────────
-- O vínculo staff ↔ auth.users só muda pelo servidor (service role), nunca
-- pelo navegador: impede que alguém se "anexe" a outra conta.

create or replace function public.tg_staff_protect_access()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.auth_user_id := null;
    new.access_invited_at := null;
    new.access_accepted_at := null;
  else
    new.auth_user_id := old.auth_user_id;
    new.access_invited_at := old.access_invited_at;
    new.access_accepted_at := old.access_accepted_at;
  end if;
  return new;
end;
$$;

drop trigger if exists staff_protect_access on public.staff;
create trigger staff_protect_access
before insert or update on public.staff
for each row execute function public.tg_staff_protect_access();

-- ───────────────────────────── políticas ───────────────────────────────────

-- units
drop policy if exists "Platform users manage own units" on public.units;
create policy "Platform users read units"
on public.units for select to authenticated
using (account_id = public.current_platform_account_id());
create policy "Managers write units"
on public.units for all to authenticated
using (account_id = public.current_platform_account_id() and public.current_is_manager())
with check (account_id = public.current_platform_account_id() and public.current_is_manager());

-- staff
drop policy if exists "Platform users manage own staff" on public.staff;
create policy "Platform users read staff"
on public.staff for select to authenticated
using (account_id = public.current_platform_account_id());
create policy "Managers write staff"
on public.staff for all to authenticated
using (account_id = public.current_platform_account_id() and public.current_is_manager())
with check (account_id = public.current_platform_account_id() and public.current_is_manager());

-- plans
drop policy if exists "Platform users manage own plans" on public.plans;
create policy "Platform users read plans"
on public.plans for select to authenticated
using (account_id = public.current_platform_account_id());
create policy "Managers write plans"
on public.plans for all to authenticated
using (account_id = public.current_platform_account_id() and public.current_is_manager())
with check (account_id = public.current_platform_account_id() and public.current_is_manager());

-- students
drop policy if exists "Platform users manage own students" on public.students;
create policy "Platform users read students in scope"
on public.students for select to authenticated
using (
  account_id = public.current_platform_account_id()
  and (
    public.current_unit_scope() is null
    or unit_id is null
    or unit_id = public.current_unit_scope()
  )
);
create policy "Allowed staff insert students"
on public.students for insert to authenticated
with check (
  account_id = public.current_platform_account_id()
  and public.current_can('register_students')
  and (public.current_unit_scope() is null or unit_id = public.current_unit_scope())
);
create policy "Allowed staff update students"
on public.students for update to authenticated
using (
  account_id = public.current_platform_account_id()
  and (
    public.current_can('register_students')
    -- vincular/trocar plano é ação de cobrança
    or public.current_can('payments')
  )
  and (public.current_unit_scope() is null or unit_id is null or unit_id = public.current_unit_scope())
)
with check (
  account_id = public.current_platform_account_id()
  and (public.current_unit_scope() is null or unit_id is null or unit_id = public.current_unit_scope())
);
create policy "Managers delete students"
on public.students for delete to authenticated
using (account_id = public.current_platform_account_id() and public.current_is_manager());

-- payments (a visibilidade segue a do aluno: o subselect respeita a RLS de students)
drop policy if exists "Platform users manage own payments" on public.payments;
create policy "Platform users read payments of visible students"
on public.payments for select to authenticated
using (
  account_id = public.current_platform_account_id()
  and exists (select 1 from public.students s where s.id = student_id)
);
create policy "Allowed staff create payments"
on public.payments for insert to authenticated
with check (
  account_id = public.current_platform_account_id()
  and exists (select 1 from public.students s where s.id = student_id)
  and (
    public.current_can('payments')
    -- quem cadastra aluno com plano abre o primeiro ciclo de cobrança
    or (public.current_can('register_students') and status = 'pendente' and paid_at is null)
  )
);
create policy "Allowed staff update payments"
on public.payments for update to authenticated
using (
  account_id = public.current_platform_account_id()
  and public.current_can('payments')
  and exists (select 1 from public.students s where s.id = student_id)
)
with check (account_id = public.current_platform_account_id());
create policy "Managers delete payments"
on public.payments for delete to authenticated
using (account_id = public.current_platform_account_id() and public.current_is_manager());

-- student_activities
drop policy if exists "Platform users manage own student activities" on public.student_activities;
create policy "Platform users read activities of visible students"
on public.student_activities for select to authenticated
using (
  account_id = public.current_platform_account_id()
  and exists (select 1 from public.students s where s.id = student_id)
);
create policy "Platform users log activities"
on public.student_activities for insert to authenticated
with check (
  account_id = public.current_platform_account_id()
  and exists (select 1 from public.students s where s.id = student_id)
);
create policy "Authors or managers delete activities"
on public.student_activities for delete to authenticated
using (
  account_id = public.current_platform_account_id()
  and (public.current_is_manager() or created_by = auth.uid())
);
