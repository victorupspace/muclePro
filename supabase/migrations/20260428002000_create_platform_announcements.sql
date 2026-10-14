-- Notificações broadcast emitidas pelo backoffice e consumidas pelos
-- consultores/comercializadoras dentro da plataforma.
--
-- Modelo: 1 anúncio + 1 leitura por usuário (criada sob demanda).

create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  kind text not null default 'sistema'
    check (kind in ('sistema', 'lead', 'tarefa', 'pagamento')),
  title text not null,
  body text not null,
  href text,
  audience text not null default 'all'
    check (audience in ('all', 'consultor', 'comercializadora')),
  published_at timestamptz,
  expires_at timestamptz
);

create index if not exists platform_announcements_published_at_idx
  on public.platform_announcements (published_at desc);

create index if not exists platform_announcements_audience_idx
  on public.platform_announcements (audience);

create table if not exists public.platform_announcement_reads (
  announcement_id uuid not null references public.platform_announcements(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, account_id)
);

create index if not exists platform_announcement_reads_account_idx
  on public.platform_announcement_reads (account_id);

-- Helper: o anúncio é elegível para o account informado?
create or replace function public.announcement_is_visible_for(
  ann public.platform_announcements,
  acc public.accounts
)
returns boolean
language sql
stable
as $$
  select
    ann.published_at is not null
    and ann.published_at <= now()
    and (ann.expires_at is null or ann.expires_at > now())
    and (ann.audience = 'all' or ann.audience = acc.kind)
$$;

-- View consumida pela plataforma: anúncios visíveis para o usuário corrente
-- com o campo `read` resolvido a partir de platform_announcement_reads.
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
  a.audience,
  a.published_at,
  a.expires_at,
  acc.id as account_id,
  (r.account_id is not null) as read,
  r.read_at
from public.platform_announcements a
join public.accounts acc
  on acc.auth_user_id = auth.uid()
  and acc.status = 'criada'
  and acc.active = true
left join public.platform_announcement_reads r
  on r.announcement_id = a.id
  and r.account_id = acc.id
where public.announcement_is_visible_for(a, acc);

-- RPC: marca todos os anúncios visíveis como lidos para o account corrente.
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

  with eligible as (
    select a.id
    from public.platform_announcements a
    join public.accounts acc on acc.id = v_account_id
    where public.announcement_is_visible_for(a, acc)
  ), inserted as (
    insert into public.platform_announcement_reads (announcement_id, account_id)
    select e.id, v_account_id from eligible e
    on conflict (announcement_id, account_id) do nothing
    returning 1
  )
  select count(*)::int into v_inserted from inserted;

  return v_inserted;
end;
$$;

alter table public.platform_announcements enable row level security;
alter table public.platform_announcement_reads enable row level security;

-- Leitura: qualquer usuário autenticado pode ler anúncios elegíveis ao seu
-- account; admins enxergam tudo (incluindo rascunhos).
drop policy if exists "Platform users can read visible announcements"
  on public.platform_announcements;
create policy "Platform users can read visible announcements"
on public.platform_announcements
for select
to authenticated
using (
  public.is_musclepro_admin()
  or exists (
    select 1
    from public.accounts acc
    where acc.auth_user_id = auth.uid()
      and acc.status = 'criada'
      and acc.active = true
      and public.announcement_is_visible_for(platform_announcements, acc)
  )
);

drop policy if exists "Admins can manage announcements"
  on public.platform_announcements;
create policy "Admins can manage announcements"
on public.platform_announcements
for all
to authenticated
using (public.is_musclepro_admin())
with check (public.is_musclepro_admin());

-- Leituras: usuário só enxerga e escreve as próprias.
drop policy if exists "Users can read own announcement reads"
  on public.platform_announcement_reads;
create policy "Users can read own announcement reads"
on public.platform_announcement_reads
for select
to authenticated
using (
  account_id = public.current_platform_account_id()
  or public.is_musclepro_admin()
);

drop policy if exists "Users can insert own announcement reads"
  on public.platform_announcement_reads;
create policy "Users can insert own announcement reads"
on public.platform_announcement_reads
for insert
to authenticated
with check (account_id = public.current_platform_account_id());

drop policy if exists "Users can delete own announcement reads"
  on public.platform_announcement_reads;
create policy "Users can delete own announcement reads"
on public.platform_announcement_reads
for delete
to authenticated
using (account_id = public.current_platform_account_id());

grant select, insert, update, delete on public.platform_announcements to authenticated;
grant select, insert, delete on public.platform_announcement_reads to authenticated;
grant select on public.v_my_announcements to authenticated;
grant execute on function public.mark_all_announcements_read() to authenticated;
grant execute on function public.announcement_is_visible_for(public.platform_announcements, public.accounts) to authenticated;
