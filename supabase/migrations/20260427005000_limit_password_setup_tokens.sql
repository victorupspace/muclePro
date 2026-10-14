alter table public.password_setup_tokens
add column if not exists use_count integer not null default 0 check (use_count >= 0);

alter table public.password_setup_tokens
add column if not exists last_used_at timestamptz;

update public.password_setup_tokens
set
  use_count = 1,
  last_used_at = used_at
where used_at is not null
  and use_count = 0;
