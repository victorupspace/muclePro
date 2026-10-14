create table if not exists public.password_setup_tokens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists password_setup_tokens_account_created_at_idx
  on public.password_setup_tokens (account_id, created_at desc);

create index if not exists password_setup_tokens_token_hash_idx
  on public.password_setup_tokens (token_hash);

alter table public.password_setup_tokens enable row level security;

drop policy if exists "Admins can read password setup tokens" on public.password_setup_tokens;
create policy "Admins can read password setup tokens"
on public.password_setup_tokens
for select
to authenticated
using (public.is_musclepro_admin());

grant select on public.password_setup_tokens to authenticated;
