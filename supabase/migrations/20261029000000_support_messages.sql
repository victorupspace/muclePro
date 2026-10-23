-- Fale conosco: mensagens que as academias mandam para a equipe musclePro.
-- A academia logada envia; só o backoffice lê e muda a situação.

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
  sender_user_id uuid references auth.users(id) on delete set null,
  name text not null check (length(trim(name)) between 2 and 120),
  subject text not null check (length(trim(subject)) between 3 and 150),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  message text not null check (length(trim(message)) between 10 and 750),
  status text not null default 'aberta' check (status in ('aberta', 'respondida', 'arquivada')),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_status_idx on public.support_messages (status, created_at desc);

alter table public.support_messages enable row level security;

drop policy if exists "Platform users send support messages" on public.support_messages;
create policy "Platform users send support messages"
on public.support_messages for insert to authenticated
with check (
  account_id = public.current_platform_account_id()
  and sender_user_id = auth.uid()
  and status = 'aberta'
);

drop policy if exists "Admins manage support messages" on public.support_messages;
create policy "Admins manage support messages"
on public.support_messages for all to authenticated
using (public.is_musclepro_admin())
with check (public.is_musclepro_admin());
