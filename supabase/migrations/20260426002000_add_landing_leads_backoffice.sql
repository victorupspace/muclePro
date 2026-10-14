alter table public.hero_form_submissions
add column if not exists status text not null default 'aguardando' check (
  status in ('aguardando', 'em_contato', 'convertida', 'perdida')
);

alter table public.hero_form_submissions
add column if not exists handled_at timestamptz;

create index if not exists hero_form_submissions_status_created_at_idx
  on public.hero_form_submissions (status, created_at desc);

drop policy if exists "Anyone can create hero form submissions" on public.hero_form_submissions;
create policy "Anyone can create hero form submissions"
on public.hero_form_submissions
for insert
to anon, authenticated
with check (
  status = 'aguardando'
  and handled_at is null
  and length(trim(full_name)) > 2
  and position('@' in email) > 1
  and length(trim(phone)) >= 8
);

alter table public.audit_events
drop constraint if exists audit_events_resource_type_check;

alter table public.audit_events
add constraint audit_events_resource_type_check
check (resource_type in ('account', 'commercializer_lead', 'hero_form_submission'));

drop policy if exists "Admins can read hero form submissions" on public.hero_form_submissions;
create policy "Admins can read hero form submissions"
on public.hero_form_submissions
for select
to authenticated
using (public.is_musclepro_admin());

drop policy if exists "Admins can update hero form submissions" on public.hero_form_submissions;
create policy "Admins can update hero form submissions"
on public.hero_form_submissions
for update
to authenticated
using (public.is_musclepro_admin())
with check (public.is_musclepro_admin());

drop policy if exists "Admins can delete hero form submissions" on public.hero_form_submissions;
create policy "Admins can delete hero form submissions"
on public.hero_form_submissions
for delete
to authenticated
using (public.is_musclepro_admin());

grant select, update, delete on public.hero_form_submissions to authenticated;
