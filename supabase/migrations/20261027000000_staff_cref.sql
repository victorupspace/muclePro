-- CREF do personal: obrigatório para o perfil "personal", no formato do
-- conselho (número, categoria G ou P e UF), ex.: 012345-G/SP.
-- A regra só roda no cadastro, na troca de perfil ou na troca do CREF, para
-- não travar a edição de personais antigos ainda sem CREF.

alter table public.staff add column if not exists cref text;

create or replace function public.tg_staff_cref()
returns trigger
language plpgsql
as $$
begin
  if new.cref is not null then
    new.cref := nullif(upper(trim(new.cref)), '');
  end if;

  if new.cref is not null and new.cref !~ '^\d{1,6}-[GP]/(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$' then
    raise exception 'CREF inválido. Use número, categoria e UF, ex.: 012345-G/SP.'
      using errcode = 'MP005';
  end if;

  if new.role = 'personal' and new.cref is null
     and (tg_op = 'INSERT' or new.role is distinct from old.role or old.cref is not null) then
    raise exception 'Informe o CREF do personal.'
      using errcode = 'MP005';
  end if;

  return new;
end;
$$;

drop trigger if exists staff_cref on public.staff;
create trigger staff_cref
before insert or update on public.staff
for each row execute function public.tg_staff_cref();
