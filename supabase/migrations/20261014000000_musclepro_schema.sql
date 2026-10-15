-- ============================================================================
-- musclePro — schema inicial para gestão de estabelecimentos de atividade
-- física. Substitui integralmente o schema herdado do produto de energia.
--
--   admin_profiles           quem acessa o backoffice interno
--   accounts                 o estabelecimento (tenant) e seu ciclo de aprovação
--   hero_form_submissions    leads do formulário da home
--   audit_events             trilha de ações do backoffice
--   password_setup_tokens    links de definição de senha
--   platform_announcements   avisos do backoffice para os estabelecimentos
--   units                    filiais
--   staff                    funcionários, perfis e permissões (alçadas)
--   plans                    planos de pagamento (valor + frequência)
--   students                 alunos
--   payments                 cobranças por aluno (ciclo do plano)
--   tasks                    tarefas do gestor
--   student_activities       histórico por aluno
--
-- Multi-tenancy: todas as tabelas da plataforma carregam account_id e as
-- políticas usam public.current_platform_account_id(), que resolve a conta
-- do usuário logado (dono da conta ou funcionário com login).
-- ============================================================================

create extension if not exists pgcrypto;

-- ───────────────────────────── helpers ─────────────────────────────────────

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────────── backoffice ──────────────────────────────────

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  email text not null,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'operador')),
  active boolean not null default true
);

create or replace function public.is_musclepro_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role in ('admin', 'operador')
  );
$$;

-- Só o papel "admin" gerencia outros administradores.
create or replace function public.is_musclepro_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role = 'admin'
  );
$$;

-- ───────────────────────────── accounts ────────────────────────────────────

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- responsável pela conta
  full_name text not null,
  email text not null,
  phone text not null,
  document_type text not null check (document_type in ('cnpj', 'cpf')),
  document text not null,

  -- estabelecimento
  company_name text,
  business_type text check (
    business_type in ('academia', 'estudio', 'natacao', 'crossfit', 'lutas', 'outro')
  ),
  address text,
  contact_phone text,
  contact_email text,
  units_range text,
  active_students_range text,

  -- ciclo de vida no backoffice
  status text not null default 'nova' check (status in ('nova', 'criada')),
  active boolean not null default true,
  approved_at timestamptz,
  invited_at timestamptz,
  auth_user_id uuid references auth.users(id) on delete set null,

  -- assinatura do musclePro (controle manual no backoffice)
  payment_status text not null default 'nao_iniciado' check (
    payment_status in ('em_dia', 'pendente', 'atrasado', 'trial', 'cancelado', 'nao_iniciado')
  ),
  payment_plan text,
  payment_monthly_amount numeric(12,2),
  payment_next_due_at timestamptz,
  payment_last_paid_at timestamptz,

  source text not null default 'cadastro',
  metadata jsonb not null default '{}'::jsonb
);

create index accounts_status_created_at_idx on public.accounts (status, created_at desc);
create unique index accounts_email_unique_idx on public.accounts (lower(email));
create index accounts_auth_user_id_idx on public.accounts (auth_user_id);

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.tg_set_updated_at();

-- ───────────────────────────── leads da home ───────────────────────────────

create table public.hero_form_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text not null,
  email text not null,
  business_type text not null check (
    business_type in ('academia', 'estudio', 'natacao', 'crossfit', 'lutas', 'outro')
  ),
  units_range text,
  active_students_range text,
  status text not null default 'aguardando' check (
    status in ('aguardando', 'em_contato', 'convertida', 'perdida')
  ),
  handled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index hero_form_submissions_status_created_at_idx
  on public.hero_form_submissions (status, created_at desc);

-- ───────────────────────────── auditoria ───────────────────────────────────

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  resource_type text not null check (resource_type in ('account', 'hero_form_submission')),
  resource_id uuid not null,
  label text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_label text,
  metadata jsonb not null default '{}'::jsonb
);

create index audit_events_resource_idx
  on public.audit_events (resource_type, resource_id, created_at desc);

-- ───────────────────────────── tokens de senha ─────────────────────────────

create table public.password_setup_tokens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  use_count integer not null default 0 check (use_count >= 0),
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create index password_setup_tokens_account_created_at_idx
  on public.password_setup_tokens (account_id, created_at desc);

-- ───────────────────────────── filiais ─────────────────────────────────────

create table public.units (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  address text,
  city text,
  state text,
  phone text,
  is_main boolean not null default false,
  active boolean not null default true
);

create index units_account_idx on public.units (account_id, created_at);

create trigger units_set_updated_at
before update on public.units
for each row execute function public.tg_set_updated_at();

-- ───────────────────────────── equipe ──────────────────────────────────────

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  -- preenchido quando o funcionário ganha login próprio
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  cpf text,
  email text,
  phone text,
  role text not null default 'recepcao' check (
    role in ('gestao', 'recepcao', 'contabilidade', 'personal', 'outro')
  ),
  role_label text,
  started_at date,
  ended_at date,
  -- alçadas
  can_register_students boolean not null default false,
  can_send_payment_links boolean not null default false,
  can_create_workouts boolean not null default false,
  active boolean not null default true,
  notes text
);

create index staff_account_idx on public.staff (account_id, active, full_name);
create index staff_unit_idx on public.staff (unit_id);

create trigger staff_set_updated_at
before update on public.staff
for each row execute function public.tg_set_updated_at();

-- ───────────────────────────── planos ──────────────────────────────────────

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  frequency text not null check (
    frequency in ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual')
  ),
  description text,
  active boolean not null default true
);

create index plans_account_idx on public.plans (account_id, active, name);

create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.tg_set_updated_at();

-- ───────────────────────────── alunos ──────────────────────────────────────

create table public.students (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  cpf text,
  birth_date date,
  whatsapp text,
  email text,
  medical_notes text,
  emergency_contact_name text,
  emergency_contact_phone text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  plan_started_at date,
  notes text
);

create index students_account_idx on public.students (account_id, status, full_name);
create index students_plan_idx on public.students (plan_id);
create index students_unit_idx on public.students (unit_id);

create trigger students_set_updated_at
before update on public.students
for each row execute function public.tg_set_updated_at();

-- ───────────────────────────── cobranças ───────────────────────────────────
-- Uma linha por ciclo do plano. "Atrasado" é derivado: pendente com due_at
-- anterior a hoje. Inadimplência do aluno = ter pelo menos um atraso.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  amount numeric(12,2) not null check (amount >= 0),
  due_at date not null,
  paid_at timestamptz,
  method text check (method in ('pix', 'cartao', 'dinheiro', 'boleto', 'outro')),
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  reference_label text,
  notes text,
  created_by uuid references auth.users(id) on delete set null
);

create index payments_student_due_idx on public.payments (student_id, due_at desc);
create index payments_account_status_due_idx on public.payments (account_id, status, due_at);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.tg_set_updated_at();

-- ───────────────────────────── tarefas ─────────────────────────────────────

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  due_at timestamptz,
  priority text not null default 'media' check (priority in ('baixa', 'media', 'alta')),
  done boolean not null default false,
  done_at timestamptz
);

create index tasks_account_done_due_idx on public.tasks (account_id, done, due_at);
create index tasks_student_idx on public.tasks (student_id);

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.tg_set_updated_at();

-- ───────────────────────────── histórico do aluno ──────────────────────────

create table public.student_activities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  kind text not null check (
    kind in ('cadastro', 'nota', 'pagamento', 'cobranca', 'plano', 'status', 'contato', 'tarefa')
  ),
  title text not null,
  body text,
  metadata jsonb
);

create index student_activities_student_idx
  on public.student_activities (student_id, created_at desc);

-- ───────────────────────────── avisos ──────────────────────────────────────

create table public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  kind text not null default 'sistema' check (kind in ('sistema', 'lead', 'tarefa', 'pagamento')),
  title text not null,
  body text not null,
  href text,
  audience text not null default 'all' check (audience in ('all')),
  published_at timestamptz,
  expires_at timestamptz
);

create index platform_announcements_published_at_idx
  on public.platform_announcements (published_at desc);

create trigger platform_announcements_set_updated_at
before update on public.platform_announcements
for each row execute function public.tg_set_updated_at();

create table public.platform_announcement_reads (
  announcement_id uuid not null references public.platform_announcements(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, account_id)
);

-- ───────────────────────────── funções da plataforma ───────────────────────

-- Conta do usuário logado: dono da conta ou funcionário com login.
create or replace function public.current_platform_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select a.id
      from public.accounts a
      where a.auth_user_id = auth.uid()
        and a.status = 'criada'
        and a.active = true
      limit 1
    ),
    (
      select s.account_id
      from public.staff s
      join public.accounts a on a.id = s.account_id
      where s.auth_user_id = auth.uid()
        and s.active = true
        and a.status = 'criada'
        and a.active = true
      limit 1
    )
  );
$$;

-- O dono edita os dados da empresa por RPC para não expor as colunas de
-- status/assinatura, que só o backoffice altera.
create or replace function public.update_company_profile(
  p_company_name text,
  p_business_type text,
  p_document_type text,
  p_document text,
  p_address text,
  p_contact_phone text,
  p_contact_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select a.id into v_id
  from public.accounts a
  where a.auth_user_id = auth.uid()
    and a.status = 'criada'
    and a.active = true
  limit 1;

  if v_id is null then
    raise exception 'Somente o responsável pela conta pode editar a empresa.';
  end if;

  update public.accounts
  set company_name = p_company_name,
      business_type = p_business_type,
      document_type = p_document_type,
      document = p_document,
      address = p_address,
      contact_phone = p_contact_phone,
      contact_email = p_contact_email
  where id = v_id;
end;
$$;

create or replace function public.announcement_is_visible(ann public.platform_announcements)
returns boolean
language sql
stable
as $$
  select ann.published_at is not null
    and ann.published_at <= now()
    and (ann.expires_at is null or ann.expires_at > now());
$$;

create or replace view public.v_my_announcements
with (security_invoker = true)
as
select
  a.id,
  a.created_at,
  a.kind,
  a.title,
  a.body,
  a.href,
  a.published_at,
  a.expires_at,
  acc.id as account_id,
  (r.account_id is not null) as read,
  r.read_at
from public.platform_announcements a
join public.accounts acc on acc.id = public.current_platform_account_id()
left join public.platform_announcement_reads r
  on r.announcement_id = a.id and r.account_id = acc.id
where public.announcement_is_visible(a);

create or replace function public.mark_all_announcements_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_inserted integer;
begin
  v_account_id := public.current_platform_account_id();
  if v_account_id is null then
    return 0;
  end if;

  with inserted as (
    insert into public.platform_announcement_reads (announcement_id, account_id)
    select a.id, v_account_id
    from public.platform_announcements a
    where public.announcement_is_visible(a)
    on conflict (announcement_id, account_id) do nothing
    returning 1
  )
  select count(*)::int into v_inserted from inserted;

  return v_inserted;
end;
$$;

-- ───────────────────────────── RLS ─────────────────────────────────────────

alter table public.admin_profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.hero_form_submissions enable row level security;
alter table public.audit_events enable row level security;
alter table public.password_setup_tokens enable row level security;
alter table public.units enable row level security;
alter table public.staff enable row level security;
alter table public.plans enable row level security;
alter table public.students enable row level security;
alter table public.payments enable row level security;
alter table public.tasks enable row level security;
alter table public.student_activities enable row level security;
alter table public.platform_announcements enable row level security;
alter table public.platform_announcement_reads enable row level security;

-- admin_profiles
create policy "Admins can read admin profiles"
on public.admin_profiles for select to authenticated
using (public.is_musclepro_admin() or user_id = auth.uid());

create policy "Superadmins manage admin profiles"
on public.admin_profiles for all to authenticated
using (public.is_musclepro_superadmin())
with check (public.is_musclepro_superadmin());

-- accounts
create policy "Anyone can sign up an account"
on public.accounts for insert to anon, authenticated
with check (
  status = 'nova'
  and active = true
  and approved_at is null
  and invited_at is null
  and auth_user_id is null
  and payment_status = 'nao_iniciado'
  and source = 'cadastro'
  and length(trim(full_name)) > 2
  and position('@' in email) > 1
  and length(trim(phone)) >= 8
  and length(trim(document)) >= 11
);

create policy "Admins can read accounts"
on public.accounts for select to authenticated
using (public.is_musclepro_admin());

create policy "Admins can update accounts"
on public.accounts for update to authenticated
using (public.is_musclepro_admin())
with check (public.is_musclepro_admin());

create policy "Admins can delete accounts"
on public.accounts for delete to authenticated
using (public.is_musclepro_admin());

create policy "Platform users can read own account"
on public.accounts for select to authenticated
using (id = public.current_platform_account_id());

-- hero_form_submissions
create policy "Anyone can send a lead"
on public.hero_form_submissions for insert to anon, authenticated
with check (
  status = 'aguardando'
  and handled_at is null
  and length(trim(full_name)) > 2
  and position('@' in email) > 1
  and length(trim(phone)) >= 8
);

create policy "Admins manage leads"
on public.hero_form_submissions for all to authenticated
using (public.is_musclepro_admin())
with check (public.is_musclepro_admin());

-- audit_events
create policy "Admins can read audit events"
on public.audit_events for select to authenticated
using (public.is_musclepro_admin());

create policy "Admins can create audit events"
on public.audit_events for insert to authenticated
with check (public.is_musclepro_admin());

-- password_setup_tokens (escrita só via service role)
create policy "Admins can read password setup tokens"
on public.password_setup_tokens for select to authenticated
using (public.is_musclepro_admin());

-- tabelas da plataforma
create policy "Platform users manage own units"
on public.units for all to authenticated
using (account_id = public.current_platform_account_id())
with check (account_id = public.current_platform_account_id());

create policy "Platform users manage own staff"
on public.staff for all to authenticated
using (account_id = public.current_platform_account_id())
with check (account_id = public.current_platform_account_id());

create policy "Platform users manage own plans"
on public.plans for all to authenticated
using (account_id = public.current_platform_account_id())
with check (account_id = public.current_platform_account_id());

create policy "Platform users manage own students"
on public.students for all to authenticated
using (account_id = public.current_platform_account_id())
with check (account_id = public.current_platform_account_id());

create policy "Platform users manage own payments"
on public.payments for all to authenticated
using (account_id = public.current_platform_account_id())
with check (
  account_id = public.current_platform_account_id()
  and exists (
    select 1 from public.students s
    where s.id = student_id and s.account_id = public.current_platform_account_id()
  )
);

create policy "Platform users manage own tasks"
on public.tasks for all to authenticated
using (account_id = public.current_platform_account_id())
with check (
  account_id = public.current_platform_account_id()
  and (
    student_id is null
    or exists (
      select 1 from public.students s
      where s.id = student_id and s.account_id = public.current_platform_account_id()
    )
  )
);

create policy "Platform users manage own student activities"
on public.student_activities for all to authenticated
using (account_id = public.current_platform_account_id())
with check (
  account_id = public.current_platform_account_id()
  and exists (
    select 1 from public.students s
    where s.id = student_id and s.account_id = public.current_platform_account_id()
  )
);

-- avisos
create policy "Platform users read visible announcements"
on public.platform_announcements for select to authenticated
using (public.is_musclepro_admin() or public.announcement_is_visible(platform_announcements));

create policy "Admins manage announcements"
on public.platform_announcements for all to authenticated
using (public.is_musclepro_admin())
with check (public.is_musclepro_admin());

create policy "Users read own announcement reads"
on public.platform_announcement_reads for select to authenticated
using (account_id = public.current_platform_account_id() or public.is_musclepro_admin());

create policy "Users insert own announcement reads"
on public.platform_announcement_reads for insert to authenticated
with check (account_id = public.current_platform_account_id());

create policy "Users delete own announcement reads"
on public.platform_announcement_reads for delete to authenticated
using (account_id = public.current_platform_account_id());

-- ───────────────────────────── grants ──────────────────────────────────────

grant usage on schema public to anon, authenticated;

grant select on public.admin_profiles to authenticated;
grant all on public.admin_profiles to authenticated;

grant insert on public.accounts to anon, authenticated;
grant select, update, delete on public.accounts to authenticated;

grant insert on public.hero_form_submissions to anon, authenticated;
grant select, update, delete on public.hero_form_submissions to authenticated;

grant select, insert on public.audit_events to authenticated;
grant select on public.password_setup_tokens to authenticated;

grant select, insert, update, delete on public.units to authenticated;
grant select, insert, update, delete on public.staff to authenticated;
grant select, insert, update, delete on public.plans to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.student_activities to authenticated;

grant select, insert, update, delete on public.platform_announcements to authenticated;
grant select, insert, delete on public.platform_announcement_reads to authenticated;
grant select on public.v_my_announcements to authenticated;

grant execute on function public.is_musclepro_admin() to anon, authenticated;
grant execute on function public.is_musclepro_superadmin() to anon, authenticated;
grant execute on function public.current_platform_account_id() to authenticated;
grant execute on function public.update_company_profile(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.announcement_is_visible(public.platform_announcements) to authenticated;
grant execute on function public.mark_all_announcements_read() to authenticated;
