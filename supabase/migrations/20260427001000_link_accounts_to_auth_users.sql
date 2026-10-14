alter table public.accounts
add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

alter table public.accounts
add column if not exists invited_at timestamptz;

create index if not exists accounts_auth_user_id_idx
  on public.accounts (auth_user_id);

drop policy if exists "Users can read own approved account" on public.accounts;
create policy "Users can read own approved account"
on public.accounts
for select
to authenticated
using (
  auth_user_id = auth.uid()
  and status = 'criada'
  and active = true
);
